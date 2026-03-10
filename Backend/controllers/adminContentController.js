// Backend/controllers/adminContentController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function listContentBlocks(req, res) {
  try {
    const { type, search } = req.query;

    let query = supabaseAdmin
      .from('content_blocks')
      .select('id, slug, title, type, is_active, sort_order, updated_at')
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

