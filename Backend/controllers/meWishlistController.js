// Backend/controllers/meWishlistController.js — /api/me/wishlist (authenticated)
import { supabaseAdmin, getProductMediaPublicUrl } from '../config/supabase.js';
import { logUserActivity } from '../lib/activityLogger.js';

function primaryImageUrl(productMedia) {
  if (!Array.isArray(productMedia)) productMedia = productMedia ? [productMedia] : [];
  const sorted = [...productMedia].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.position ?? 0) - (b.position ?? 0);
  });
  const primary = sorted.find((m) => m.media_type === 'image') || sorted[0];
  return primary ? getProductMediaPublicUrl(primary.file_path) : '';
}

/** GET /api/me/wishlist — list current user's wishlist with product details */
export async function getWishlist(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: rows, error } = await supabaseAdmin
      .from('wishlist')
      .select(`
        id,
        product_id,
        created_at,
        products (
          id,
          title,
          price,
          product_media (file_path, media_type, is_primary, position)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const list = (rows || []).map((w) => {
      const p = w.products;
      const media = p?.product_media;
      const image = primaryImageUrl(media || []);
      return {
        id: w.id,
        product_id: w.product_id,
        name: p?.title ?? 'Unknown',
        price: p?.price ?? 0,
        image,
      };
    });

    res.json(list);
  } catch (err) {
    console.error('getWishlist:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch wishlist' });
  }
}

/** POST /api/me/wishlist — add product to wishlist. Body: { product_id } */
export async function addWishlistItem(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    const { data, error } = await supabaseAdmin
      .from('wishlist')
      .insert({ user_id: userId, product_id })
      .select('id, product_id, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        // unique violation — already in wishlist
        const { data: existing } = await supabaseAdmin
          .from('wishlist')
          .select('id, product_id, created_at')
          .eq('user_id', userId)
          .eq('product_id', product_id)
          .single();
        if (existing) {
          logUserActivity(userId, 'wishlist_added', {
            product_id: existing.product_id,
            wishlist_id: existing.id,
          });
        }
        return res.status(200).json(existing || { product_id });
      }
      throw error;
    }

    logUserActivity(userId, 'wishlist_added', {
      product_id,
      wishlist_id: data?.id,
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('addWishlistItem:', err);
    res.status(500).json({ error: err.message || 'Failed to add to wishlist' });
  }
}

/** DELETE /api/me/wishlist/product/:productId — remove product from wishlist */
export async function removeWishlistByProduct(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const productId = req.params.productId;
    if (!productId) return res.status(400).json({ error: 'product_id required' });

    const { error } = await supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
    logUserActivity(userId, 'wishlist_removed', { product_id: productId });
    res.status(204).send();
  } catch (err) {
    console.error('removeWishlistByProduct:', err);
    res.status(500).json({ error: err.message || 'Failed to remove from wishlist' });
  }
}

/** DELETE /api/me/wishlist/:id — remove by wishlist row id */
export async function removeWishlistById(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id required' });

    const { error } = await supabaseAdmin
      .from('wishlist')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    logUserActivity(userId, 'wishlist_removed', { wishlist_id: id });
    res.status(204).send();
  } catch (err) {
    console.error('removeWishlistById:', err);
    res.status(500).json({ error: err.message || 'Failed to remove from wishlist' });
  }
}
