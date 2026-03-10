// Backend/controllers/adminPromotionsController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function listDiscountCodes(req, res) {
  try {
    const { active, ambassador_only } = req.query;

    // Match existing schema: discount_percent + our extra columns from SQL migration
    let query = supabaseAdmin
      .from('discount_codes')
      .select(
        'id, code, discount_percent, active, starts_at, ends_at, usage_limit, used_count, campaign_name, ambassador_id, ambassador_profile_id'
      );

    if (active === 'true') {
      query = query.eq('active', true);
    }
    if (ambassador_only === 'true') {
      // Prefer new ambassador_profile_id if present, fall back to original ambassador_id
      query = query.or('ambassador_profile_id.not.is.null,ambassador_id.not.is.null');
    }

    const [{ data: codes, error: codesError }, { data: redemptions, error: redemptionsError }] =
      await Promise.all([
        query.order('created_at', { ascending: false }),
        supabaseAdmin
          .from('discount_redemptions')
          .select('discount_code_id, discount_amount, order_id')
          .limit(10000),
      ]);

    if (codesError) throw codesError;
    if (redemptionsError && redemptionsError.code !== '42P01') throw redemptionsError;

    const redemptionsSafe = redemptions || [];
    const byCode = new Map();
    redemptionsSafe.forEach((r) => {
      const key = r.discount_code_id;
      if (!byCode.has(key)) {
        byCode.set(key, { redemptions: 0, revenue: 0 });
      }
      const agg = byCode.get(key);
      agg.redemptions += 1;
      agg.revenue += Number(r.discount_amount || 0);
    });

    const items = (codes || []).map((c) => {
      const agg = byCode.get(c.id) || { redemptions: 0, revenue: 0 };
      const value = c.discount_percent ?? null;
      return {
        id: c.id,
        code: c.code,
        type: 'percent',
        value,
        active: c.active,
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        usage_limit: c.usage_limit,
        used_count: c.used_count,
        campaign_name: c.campaign_name,
        ambassador_id: c.ambassador_profile_id || c.ambassador_id || null,
        redemptions: agg.redemptions,
        revenue: agg.revenue,
      };
    });

    res.json({ codes: items });
  } catch (err) {
    console.error('listPromotionsDiscountCodes:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch discount codes' });
  }
}

