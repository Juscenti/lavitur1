// Backend/controllers/adminSupportController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function listTickets(req, res) {
  try {
    const { status, q } = req.query;

    let query = supabaseAdmin
      .from('support_tickets')
      .select('id, subject, status, priority, category, order_id, user_id, assignee_profile_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) {
      query = query.eq('status', status);
    }
    if (q) {
      const term = `%${q.trim()}%`;
      query = query.ilike('subject', term);
    }

    const { data, error } = await query;
    if (error) throw error;

    const tickets = data || [];

    const summary = {
      open: tickets.filter((t) => t.status === 'open').length,
      pending: tickets.filter((t) => t.status === 'pending').length,
      resolved_7d: tickets.filter((t) => t.status === 'resolved').length,
    };

    res.json({ summary, tickets });
  } catch (err) {
    console.error('listTickets:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch support tickets' });
  }
}

