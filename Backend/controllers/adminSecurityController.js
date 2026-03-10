// Backend/controllers/adminSecurityController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function getOverview(req, res) {
  try {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: lockedProfiles, error: lockedError },
      { data: failedEvents, error: failedError },
      { data: staffMfa, error: staffMfaError },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id').eq('is_locked', true),
      supabaseAdmin.from('login_events').select('id').eq('success', false).gte('created_at', since24h),
      supabaseAdmin.from('profiles').select('id').neq('role', 'customer').eq('mfa_enabled', true),
    ]);

    if (lockedError) throw lockedError;
    if (failedError && failedError.code !== '42P01') throw failedError;
    if (staffMfaError && staffMfaError.code !== '42P01') throw staffMfaError;

    res.json({
      locked_accounts: (lockedProfiles || []).length,
      failed_24h: (failedEvents || []).length,
      staff_mfa_enabled: (staffMfa || []).length,
    });
  } catch (err) {
    console.error('getSecurityOverview:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch security overview' });
  }
}

export async function listLoginEvents(req, res) {
  try {
    const { user_id } = req.query;

    let query = supabaseAdmin
      .from('login_events')
      .select('id, user_id, success, ip_address, user_agent, geo_country, geo_city, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ events: data || [] });
  } catch (err) {
    console.error('listLoginEvents:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch login events' });
  }
}

