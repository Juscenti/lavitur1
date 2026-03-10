// Backend/controllers/adminLoyaltyController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function getOverview(req, res) {
  try {
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('loyalty_accounts')
      .select('user_id, points_balance, tier_id');
    if (accountsError && accountsError.code !== '42P01') throw accountsError;

    const { data: tiers, error: tiersError } = await supabaseAdmin
      .from('loyalty_tiers')
      .select('id, name, min_points')
      .order('min_points', { ascending: true });
    if (tiersError && tiersError.code !== '42P01') throw tiersError;

    const accountsSafe = accounts || [];
    const tiersSafe = tiers || [];

    const totalMembers = accountsSafe.length;
    const totalPoints = accountsSafe.reduce((sum, a) => sum + Number(a.points_balance || 0), 0);
    const avgPoints = totalMembers > 0 ? Math.round(totalPoints / totalMembers) : 0;

    const tierCounts = tiersSafe.map((tier) => ({
      id: tier.id,
      name: tier.name,
      min_points: tier.min_points,
      members: accountsSafe.filter((a) => a.tier_id === tier.id).length,
    }));

    res.json({
      members: totalMembers,
      total_points: totalPoints,
      avg_points: avgPoints,
      tiers: tierCounts,
    });
  } catch (err) {
    console.error('getLoyaltyOverview:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch loyalty overview' });
  }
}

export async function getTiers(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('loyalty_tiers')
      .select('id, name, description, min_points, benefits')
      .order('min_points', { ascending: true });
    if (error) throw error;
    const tiers = (data || []).map((t) => ({
      ...t,
      benefits_summary: typeof t.benefits === 'object' && t.benefits !== null ? JSON.stringify(t.benefits) : t.description,
    }));
    res.json({ tiers });
  } catch (err) {
    console.error('getTiers:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch loyalty tiers' });
  }
}

