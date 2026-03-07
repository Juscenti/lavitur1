// Backend/controllers/productReviewsController.js — /api/products/:id/reviews
import { supabaseAdmin } from '../config/supabase.js';

/** GET /api/products/:id/reviews — list reviews for a product (public) */
export async function listProductReviews(req, res) {
  try {
    const productId = req.params.id;
    if (!productId) return res.status(400).json({ error: 'Product id required' });

    const { data: rows, error } = await supabaseAdmin
      .from('product_reviews')
      .select('id, product_id, user_id, rating, body, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const userIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))];
    let usernames = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      usernames = new Map((profiles || []).map((p) => [p.id, p.username || 'Anonymous']));
    }

    const list = (rows || []).map((r) => ({
      id: r.id,
      product_id: r.product_id,
      userId: r.user_id,
      name: usernames.get(r.user_id) ?? 'Anonymous',
      rating: Number(r.rating) || 0,
      comment: r.body ?? '',
      date: r.created_at,
    }));

    res.json(list);
  } catch (err) {
    console.error('listProductReviews:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch reviews' });
  }
}

/** POST /api/products/:id/reviews — add review (authenticated). Body: { rating, body? } */
export async function createProductReview(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const productId = req.params.id;
    if (!productId) return res.status(400).json({ error: 'Product id required' });

    const { rating, body } = req.body;
    const r = parseInt(rating, 10);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: 'rating must be 1–5' });
    }

    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .insert({
        product_id: productId,
        user_id: userId,
        rating: r,
        body: body != null ? String(body).trim() : null,
      })
      .select('id, product_id, user_id, rating, body, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      product_id: data.product_id,
      userId: data.user_id,
      rating: data.rating,
      comment: data.body ?? '',
      date: data.created_at,
    });
  } catch (err) {
    console.error('createProductReview:', err);
    res.status(500).json({ error: err.message || 'Failed to add review' });
  }
}

/** DELETE /api/products/:id/reviews/:reviewId — delete own review */
export async function deleteProductReview(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: productId, reviewId } = req.params;
    if (!reviewId) return res.status(400).json({ error: 'review id required' });

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('product_reviews')
      .select('id, user_id')
      .eq('id', reviewId)
      .eq('product_id', productId)
      .single();

    if (fetchErr || !row) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (row.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own review' });
    }

    const { error } = await supabaseAdmin
      .from('product_reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('deleteProductReview:', err);
    res.status(500).json({ error: err.message || 'Failed to delete review' });
  }
}
