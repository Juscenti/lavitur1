// Backend/controllers/adminContentController.js
import crypto from 'crypto';
import { supabaseAdmin, getContentBlockMediaPublicUrl } from '../config/supabase.js';

const CONTENT_BUCKET = 'content-blocks';

export async function listContentBlocks(req, res) {
  try {
    const { type, search } = req.query;

    let query = supabaseAdmin
      .from('content_blocks')
      .select('id, slug, title, type, media_url, is_active, sort_order, page, variant, updated_at')
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }
    if (search) {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},slug.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ items: data || [] });
  } catch (err) {
    console.error('listContentBlocks:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch content blocks' });
  }
}

export async function getContentBlock(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('content_blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Content block not found' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('getContentBlock:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch content block' });
  }
}

export async function createContentBlock(req, res) {
  try {
    const userId = req.userId;
    const { slug, title, type, body, media_url, cta_label, cta_url, is_active, sort_order, page, variant } = req.body || {};

    if (!slug || !title || !type) {
      return res.status(400).json({ error: 'slug, title, and type are required' });
    }

    let order = typeof sort_order === 'number' ? sort_order : null;
    if (order === null) {
      const { data: maxRow } = await supabaseAdmin
        .from('content_blocks')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      order = (maxRow?.sort_order ?? -1) + 1;
    }

    const payload = {
      slug: String(slug).trim(),
      title: String(title).trim(),
      type: String(type).trim(),
      body: body != null ? String(body) : null,
      media_url: media_url != null ? String(media_url).trim() || null : null,
      cta_label: cta_label != null ? String(cta_label).trim() || null : null,
      cta_url: cta_url != null ? String(cta_url).trim() || null : null,
      is_active: is_active !== false,
      sort_order: order,
      page: page != null && String(page).trim() ? String(page).trim() : null,
      variant: variant != null && String(variant).trim() ? String(variant).trim() : null,
      created_by: userId,
      updated_by: userId,
    };

    const { data, error } = await supabaseAdmin.from('content_blocks').insert(payload).select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'A block with this slug already exists' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('createContentBlock:', err);
    res.status(500).json({ error: err.message || 'Failed to create content block' });
  }
}

export async function updateContentBlock(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { slug, title, type, body, media_url, cta_label, cta_url, is_active, sort_order, page, variant } = req.body || {};

    if (!slug || !title || !type) {
      return res.status(400).json({ error: 'slug, title, and type are required' });
    }

    const payload = {
      slug: String(slug).trim(),
      title: String(title).trim(),
      type: String(type).trim(),
      body: body != null ? String(body) : null,
      media_url: media_url != null ? String(media_url).trim() || null : null,
      cta_label: cta_label != null ? String(cta_label).trim() || null : null,
      cta_url: cta_url != null ? String(cta_url).trim() || null : null,
      is_active: is_active !== false,
      updated_by: userId,
    };
    if (typeof sort_order === 'number') payload.sort_order = sort_order;
    payload.page = page != null && String(page).trim() ? String(page).trim() : null;
    payload.variant = variant != null && String(variant).trim() ? String(variant).trim() : null;

    const { data, error } = await supabaseAdmin
      .from('content_blocks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Content block not found' });
      if (error.code === '23505') return res.status(409).json({ error: 'A block with this slug already exists' });
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('updateContentBlock:', err);
    res.status(500).json({ error: err.message || 'Failed to update content block' });
  }
}

export async function deleteContentBlock(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin.from('content_blocks').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Content block not found' });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteContentBlock:', err);
    res.status(500).json({ error: err.message || 'Failed to delete content block' });
  }
}

export async function reorderContentBlocks(req, res) {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: 'order must be a non-empty array of block ids' });
    }

    for (let i = 0; i < order.length; i++) {
      const { error } = await supabaseAdmin.from('content_blocks').update({ sort_order: i }).eq('id', order[i]);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('reorderContentBlocks:', err);
    res.status(500).json({ error: err.message || 'Failed to reorder content blocks' });
  }
}

const ALLOWED_MEDIA_TYPES = /^(image\/|video\/)/;

export async function uploadContentImage(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    if (!ALLOWED_MEDIA_TYPES.test(file.mimetype || '')) {
      return res.status(400).json({ error: 'File must be an image or video (e.g. mp4, webm)' });
    }

    const safeName = (file.originalname || 'media').replace(/\s+/g, '-');
    const filePath = `${crypto.randomUUID()}-${safeName}`;
    const contentType = file.mimetype || 'application/octet-stream';

    const { error: upErr } = await supabaseAdmin.storage.from(CONTENT_BUCKET).upload(filePath, file.buffer, {
      contentType,
      upsert: false,
    });

    if (upErr) throw upErr;

    const publicUrl = getContentBlockMediaPublicUrl(filePath);
    res.json({ url: publicUrl });
  } catch (err) {
    console.error('uploadContentImage:', err);
    res.status(500).json({ error: err.message || 'Failed to upload' });
  }
}

