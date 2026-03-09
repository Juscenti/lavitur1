// Backend/controllers/productsController.js
import { supabaseAdmin, supabaseWithUserToken, getProductMediaPublicUrl } from '../config/supabase.js';

/** Public: published products with categories and primary image for shop */
export async function listPublicProducts(req, res) {
  try {
    const { data: prodRows, error: prodErr } = await supabaseAdmin
      .from('products')
      .select(`
        id, title, description, price, stock, status, created_at,
        product_media (file_path, media_type, is_primary, position)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (prodErr) throw prodErr;

    const productIds = (prodRows || []).map((p) => p.id);
    if (productIds.length === 0) {
      return res.json([]);
    }

    const { data: links, error: linkErr } = await supabaseAdmin
      .from('product_categories')
      .select('product_id, category_id')
      .in('product_id', productIds);

    if (linkErr) throw linkErr;

    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug');

    const catById = new Map((categories || []).map((c) => [c.id, c]));
    const prodToCatIds = new Map();
    (links || []).forEach((l) => {
      const arr = prodToCatIds.get(l.product_id) || [];
      arr.push(l.category_id);
      prodToCatIds.set(l.product_id, arr);
    });

    const list = (prodRows || []).map((p) => {
      const catIds = prodToCatIds.get(p.id) || [];
      const cats = catIds.map((cid) => catById.get(cid)).filter(Boolean);
      const slugs = cats.map((c) => c.slug || (c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '')).filter(Boolean);
      const names = cats.map((c) => c.name || '').filter(Boolean);
      const primaryCat = cats[0];
      const slug = primaryCat?.slug || (primaryCat?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '') || (slugs[0] || 'uncategorized');
      const media = (p.product_media || []).sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.position ?? 0) - (b.position ?? 0);
      });
      const primaryMedia = media.find((m) => m.media_type === 'image') || media[0];
      const image_url = primaryMedia ? getProductMediaPublicUrl(primaryMedia.file_path) : '';

      return {
        id: p.id,
        title: p.title || 'Untitled',
        description: p.description || '',
        price: Number(p.price ?? 0),
        stock: Number(p.stock ?? 0),
        image_url,
        category_slug: slug,
        category_name: primaryCat?.name || names[0] || '',
        category_slugs: slugs.length ? slugs : [slug || 'uncategorized'],
        category_names: names.length ? names : [primaryCat?.name || ''],
        created_at: p.created_at,
      };
    });

    res.json(list);
  } catch (err) {
    console.error('listPublicProducts:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
}

/** Public: single published product by id (for PDP) */
export async function getOnePublicProduct(req, res) {
  try {
    const id = req.params.id;
    const { data: row, error } = await supabaseAdmin
      .from('products')
      .select(`
        id, title, description, price, stock, status, created_at,
        product_media (file_path, media_type, is_primary, position)
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !row) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { data: links } = await supabaseAdmin
      .from('product_categories')
      .select('category_id')
      .eq('product_id', row.id);
    const catIds = (links || []).map((l) => l.category_id).filter(Boolean);
    let category_slug = 'uncategorized';
    let category_name = '';
    const category_slugs = [];
    const category_names = [];
    if (catIds.length) {
      const { data: cats } = await supabaseAdmin.from('categories').select('id, name, slug').in('id', catIds);
      (cats || []).forEach((c) => {
        const s = c.slug || (c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'uncategorized';
        category_slugs.push(s);
        category_names.push(c.name || '');
      });
      if (category_slugs.length) category_slug = category_slugs[0];
      if (category_names.length) category_name = category_names[0];
    }

    // Supabase .single() can return nested relation as one object instead of array — normalize to array
    let rawMedia = row.product_media;
    if (!Array.isArray(rawMedia)) rawMedia = rawMedia ? [rawMedia] : [];
    // If nested relation is empty, fetch media directly (avoids PDP missing images when relation doesn't load)
    if (rawMedia.length === 0) {
      const { data: mediaRows } = await supabaseAdmin
        .from('product_media')
        .select('file_path, media_type, is_primary, position')
        .eq('product_id', row.id)
        .order('position', { ascending: true });
      rawMedia = mediaRows || [];
    }
    const media = [...rawMedia].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.position ?? 0) - (b.position ?? 0);
    });
    const primary = media.find((m) => m.media_type === 'image') || media[0];
    const image_url = primary ? getProductMediaPublicUrl(primary.file_path) : '';
    const images = media.filter((m) => m.media_type === 'image').map((m) => getProductMediaPublicUrl(m.file_path));

    res.json({
      id: row.id,
      title: row.title || 'Untitled',
      description: row.description || '',
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      image_url,
      images,
      category_slug,
      category_name,
      category_slugs: category_slugs.length ? category_slugs : [category_slug],
      category_names: category_names.length ? category_names : [category_name],
      created_at: row.created_at,
    });
  } catch (err) {
    console.error('getOnePublicProduct:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch product' });
  }
}

/** Admin: all products with media and category names */
export async function listAdminProducts(req, res) {
  try {
    const { data: prodRows, error: prodErr } = await supabaseAdmin
      .from('products')
      .select(`
        id, title, description, price, stock, status, created_at, updated_at,
        product_media (id, file_path, media_type, is_primary, position)
      `)
      .order('created_at', { ascending: false });

    if (prodErr) throw prodErr;

    const { data: catRows } = await supabaseAdmin.from('categories').select('id, name');
    const { data: links } = await supabaseAdmin.from('product_categories').select('product_id, category_id');

    const catById = new Map((catRows || []).map((c) => [c.id, c.name]));
    const prodToCatIds = new Map();
    (links || []).forEach((l) => {
      const arr = prodToCatIds.get(l.product_id) || [];
      arr.push(l.category_id);
      prodToCatIds.set(l.product_id, arr);
    });

    const list = (prodRows || []).map((p) => {
      const catIds = prodToCatIds.get(p.id) || [];
      const catNames = catIds.map((cid) => catById.get(cid)).filter(Boolean);
      const media = p.product_media || [];
      const primary = media.find((m) => m.is_primary && m.media_type === 'image') || media.find((m) => m.media_type === 'image');
      const thumbUrl = primary ? getProductMediaPublicUrl(primary.file_path) : null;

      return {
        id: p.id,
        name: p.title,
        description: p.description ?? '',
        price: p.price,
        stock: p.stock ?? '',
        status: p.status,
        published: p.status === 'published',
        category: catNames.length ? catNames.join(', ') : 'Unassigned',
        categories: catNames.length ? catNames : ['Unassigned'],
        thumbUrl,
        product_media: media,
      };
    });

    res.json(list);
  } catch (err) {
    console.error('listAdminProducts:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
}

/** Admin: create product — use user JWT so DB triggers (e.g. role check) see auth.uid() */
export async function createProduct(req, res) {
  try {
    const { title, description, price, stock, categoryName, categoryNames } = req.body;
    const userId = req.userId;
    const authHeader = req.headers.authorization;
    const supabase = supabaseWithUserToken(authHeader);

    const { data: inserted, error } = await supabase
      .from('products')
      .insert({
        title: title || 'Untitled',
        description: description || null,
        price: price ?? 0,
        stock: stock ?? 0,
        status: 'pending',
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    const names = Array.isArray(categoryNames) ? categoryNames.filter((n) => n && n !== 'Unassigned') : (categoryName && categoryName !== 'Unassigned' ? [categoryName] : []);
    if (names.length) {
      const { data: cats } = await supabaseAdmin.from('categories').select('id, name').in('name', names);
      const inserts = (cats || []).map((c) => ({ product_id: inserted.id, category_id: c.id }));
      if (inserts.length) {
        await supabaseAdmin.from('product_categories').insert(inserts);
      }
    }

    res.status(201).json({ id: inserted.id });
  } catch (err) {
    console.error('createProduct:', err);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
}

/** Admin: update product — use user JWT so DB triggers see auth.uid() */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { title, description, price, stock, categoryName, categoryNames } = req.body;
    const supabase = supabaseWithUserToken(req.headers.authorization);

    const { error } = await supabase
      .from('products')
      .update({
        title,
        description: description ?? null,
        price,
        stock,
      })
      .eq('id', id);

    if (error) throw error;

    await supabaseAdmin.from('product_categories').delete().eq('product_id', id);
    const names = Array.isArray(categoryNames) ? categoryNames.filter((n) => n && n !== 'Unassigned') : (categoryName && categoryName !== 'Unassigned' ? [categoryName] : []);
    if (names.length) {
      const { data: cats } = await supabaseAdmin.from('categories').select('id, name').in('name', names);
      const inserts = (cats || []).map((c) => ({ product_id: id, category_id: c.id }));
      if (inserts.length) {
        await supabaseAdmin.from('product_categories').insert(inserts);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('updateProduct:', err);
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
}

/** Admin: update product status — use user JWT so DB triggers see auth.uid() */
export async function updateProductStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['draft', 'pending', 'published', 'archived'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const supabase = supabaseWithUserToken(req.headers.authorization);
    const { error } = await supabase.from('products').update({ status }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('updateProductStatus:', err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
}

/** Admin: delete product. Requires confirm=DELETE in query or body. Removes categories + media first, then product. */
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const confirm = req.query.confirm || req.body?.confirm;
    console.log('[DEBUG deleteProduct] id:', id, '| confirm:', confirm, '| query:', req.query, '| method:', req.method);
    if (confirm !== 'DELETE') {
      console.log('[DEBUG deleteProduct] confirmation missing/wrong, returning 400');
      return res.status(400).json({
        error: 'Deletion requires confirmation. Add ?confirm=DELETE to the request.',
      });
    }
    console.log('[DEBUG deleteProduct] deleting product_categories for', id);
    await supabaseAdmin.from('product_categories').delete().eq('product_id', id);
    console.log('[DEBUG deleteProduct] deleting product_media for', id);
    await supabaseAdmin.from('product_media').delete().eq('product_id', id);
    console.log('[DEBUG deleteProduct] deleting product', id);

    // Use .select() so Supabase returns the deleted row(s) — lets us confirm the row was actually removed
    const { data: deleted, error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
      .select('id');

    console.log('[DEBUG deleteProduct] result — deleted rows:', deleted, '| error:', error);

    if (error) throw error;
    if (!deleted || deleted.length === 0) {
      // Row not found or silently blocked by RLS
      return res.status(404).json({ error: 'Product not found or could not be deleted.' });
    }
    console.log('[DEBUG deleteProduct] deleted OK', id);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteProduct:', err);
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
}

// ---------- Product media (admin) ----------
const BUCKET = 'product-media';

export async function listProductMedia(req, res) {
  try {
    const { id: productId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('product_media')
      .select('*')
      .eq('product_id', productId)
      .order('is_primary', { ascending: false })
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    const list = (data || []).map((row) => ({
      ...row,
      public_url: getProductMediaPublicUrl(row.file_path),
    }));
    res.json(list);
  } catch (err) {
    console.error('listProductMedia:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch media' });
  }
}

export async function uploadProductMedia(req, res) {
  try {
    const { id: productId } = req.params;
    const files = req.files || [];
    const makeFirstImagePrimary = req.body?.makeFirstImagePrimary === 'true';

    if (!files.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = (file.originalname || 'file').replace(/\s+/g, '-');
      const filePath = `products/${productId}/${crypto.randomUUID()}-${safeName}`;
      const mediaType = (file.mimetype || '').startsWith('video/') ? 'video' : 'image';

      const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

      if (upErr) throw upErr;

      const isPrimary = makeFirstImagePrimary && i === 0 && mediaType === 'image';
      const { data: row, error: dbErr } = await supabaseAdmin
        .from('product_media')
        .insert({
          product_id: productId,
          file_path: filePath,
          media_type: mediaType,
          position: 0,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      uploaded.push({ ...row, public_url: getProductMediaPublicUrl(row.file_path) });
    }

    res.status(201).json(uploaded);
  } catch (err) {
    console.error('uploadProductMedia:', err);
    res.status(500).json({ error: err.message || 'Failed to upload media' });
  }
}

export async function deleteProductMedia(req, res) {
  try {
    const { id: productId, mediaId } = req.params;

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('product_media')
      .select('file_path')
      .eq('id', mediaId)
      .eq('product_id', productId)
      .single();

    if (fetchErr || !row) return res.status(404).json({ error: 'Media not found' });

    await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);
    const { error: dbErr } = await supabaseAdmin.from('product_media').delete().eq('id', mediaId);
    if (dbErr) throw dbErr;
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteProductMedia:', err);
    res.status(500).json({ error: err.message || 'Failed to delete media' });
  }
}

export async function setPrimaryMedia(req, res) {
  try {
    const { id: productId, mediaId } = req.params;

    await supabaseAdmin.from('product_media').update({ is_primary: false }).eq('product_id', productId);
    const { error } = await supabaseAdmin.from('product_media').update({ is_primary: true }).eq('id', mediaId).eq('product_id', productId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('setPrimaryMedia:', err);
    res.status(500).json({ error: err.message || 'Failed to set primary' });
  }
}
