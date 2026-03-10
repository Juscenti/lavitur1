// Backend/controllers/adminAnalyticsController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function getOverview(req, res) {
  try {
    const { from, to } = req.query;

    // Daily time series
    let dailyQuery = supabaseAdmin.from('analytics_daily_orders').select('*').order('day', { ascending: true });
    if (from) dailyQuery = dailyQuery.gte('day', from);
    if (to) dailyQuery = dailyQuery.lte('day', to);
    const { data: daily, error: dailyError } = await dailyQuery;
    if (dailyError) throw dailyError;

    // Dashboard metrics (optional single row)
    const { data: metricsRow } = await supabaseAdmin.from('dashboard_metrics').select('*').single().maybeSingle();

    // Top products
    const { data: topProducts, error: topProductsError } = await supabaseAdmin
      .from('analytics_top_products')
      .select('*')
      .order('revenue', { ascending: false })
      .limit(10);
    if (topProductsError) throw topProductsError;

    // Ambassador performance
    const { data: ambassadorRows, error: ambassadorError } = await supabaseAdmin
      .from('analytics_ambassador_performance')
      .select('*')
      .order('gross_revenue', { ascending: false })
      .limit(10);
    if (ambassadorError && ambassadorError.code !== '42P01') {
      // ignore missing view; treat as no data
      throw ambassadorError;
    }

    const dailySafe = daily || [];
    const ambassadorSafe = ambassadorRows || [];

    const totalRevenue = dailySafe.reduce((sum, row) => sum + Number(row.gross_revenue || 0), 0);
    const totalOrders = dailySafe.reduce((sum, row) => sum + Number(row.orders_count || row.orders || 0), 0);
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const ambassadorRevenue = ambassadorSafe.reduce((sum, row) => sum + Number(row.gross_revenue || 0), 0);

    const kpis = {
      revenue: metricsRow?.gross_revenue ?? totalRevenue,
      orders: metricsRow?.total_orders ?? totalOrders,
      aov,
      ambassador_revenue: ambassadorRevenue,
    };

    res.json({
      kpis,
      daily: dailySafe.map((row) => ({
        day: row.day,
        orders: row.orders_count ?? row.orders ?? 0,
        revenue: row.gross_revenue ?? 0,
      })),
      topProducts: topProducts || [],
      topAmbassadors: ambassadorSafe.map((row) => ({
        ambassador_profile_id: row.ambassador_profile_id,
        name: row.ambassador_name,
        orders: row.orders_count,
        gross_revenue: row.gross_revenue,
      })),
    });
  } catch (err) {
    console.error('getOverview:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch analytics overview' });
  }
}

