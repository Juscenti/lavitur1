// Backend/controllers/meCartController.js — /api/me/cart (authenticated)
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

/** GET /api/me/cart — list current user's cart with product details */
export async function getCart(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: rows, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        product_id,
        size,
        quantity,
        created_at,
        products (
          id,
          title,
          price,
          stock,
          product_media (file_path, media_type, is_primary, position)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const list = (rows || []).map((c) => {
      const p = c.products;
      const media = p?.product_media;
      const image = primaryImageUrl(media || []);
      return {
        id: c.id,
        product_id: c.product_id,
        size: c.size || null,
        quantity: Number(c.quantity) || 1,
        name: p?.title ?? 'Unknown',
        price: p?.price ?? 0,
        stock: Number(p?.stock) ?? 0,
        image,
      };
    });

    res.json(list);
  } catch (err) {
    console.error('getCart:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch cart' });
  }
}

/** POST /api/me/cart — add or update cart item. Body: { product_id, size?, quantity? } */
export async function addCartItem(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { product_id, size, quantity: qty } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });
    const quantity = Math.max(1, parseInt(qty, 10) || 1);

    const { data: existing } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .eq('size', size ?? null)
      .maybeSingle();

    if (existing) {
      const newQty = (existing.quantity || 0) + quantity;
      const { data: updated, error } = await supabaseAdmin
        .from('cart_items')
        .update({ quantity: newQty })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;

      // Log quantity update as a cart activity.
      logUserActivity(userId, 'cart_quantity_updated', {
        product_id,
        size: size ?? null,
        quantity: newQty,
      });
      return res.status(200).json(updated);
    }

    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .insert({
        user_id: userId,
        product_id,
        size: size ?? null,
        quantity,
      })
      .select()
      .single();

    if (error) throw error;

    // Log add-to-cart activity.
    logUserActivity(userId, 'cart_added', {
      product_id,
      size: size ?? null,
      quantity,
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('addCartItem:', err);
    res.status(500).json({ error: err.message || 'Failed to add to cart' });
  }
}

/** PATCH /api/me/cart/:id — update quantity. Body: { quantity } */
export async function updateCartItem(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const quantity = Math.max(0, parseInt(req.body?.quantity, 10));
    if (Number.isNaN(quantity)) return res.status(400).json({ error: 'quantity must be a number' });

    if (quantity === 0) {
      const { error } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      logUserActivity(userId, 'cart_item_removed', { cart_item_id: id });
      return res.status(204).send();
    }

    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('updateCartItem:', err);
    res.status(500).json({ error: err.message || 'Failed to update cart' });
  }
}

/** DELETE /api/me/cart/:id — remove item from cart */
export async function removeCartItem(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('removeCartItem:', err);
    res.status(500).json({ error: err.message || 'Failed to remove from cart' });
  }
}
