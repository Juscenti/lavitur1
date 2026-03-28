// Backend/controllers/adminDashboardController.js
import { supabaseAdmin } from '../config/supabase.js';

/** IANA zone for "today" in KPIs (store calendar day). Default matches JMD checkout in `meOrdersController`. */
const BUSINESS_TZ = (process.env.DASHBOARD_BUSINESS_TZ || 'America/Jamaica').trim();

function zonedCalendarYmd(timeZone, ref = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(ref);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  return { y, m, d };
}

/**
 * UTC instant when `timeZone` crosses midnight into (y,m,d), and the next midnight (half-open [start,end)).
 * Jamaica has no DST; for other zones we scan in small steps (good enough for dashboard).
 */
function businessDayStartEndIso(timeZone, ref = new Date()) {
  if (timeZone === 'UTC' || timeZone === 'Etc/UTC') {
    const r = new Date(ref);
    const start = Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate(), 0, 0, 0, 0);
    return {
      startIso: new Date(start).toISOString(),
      endIso: new Date(start + 86400000).toISOString(),
    };
  }

  const { y, m, d } = zonedCalendarYmd(timeZone, ref);

  // Fast path: Jamaica Standard Time is UTC−5 year-round → local midnight = UTC 05:00 same civil date.
  if (timeZone === 'America/Jamaica') {
    const start = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
    return {
      startIso: new Date(start).toISOString(),
      endIso: new Date(start + 86400000).toISOString(),
    };
  }

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  function read(ms) {
    const o = {};
    for (const { type, value } of fmt.formatToParts(new Date(ms))) {
      if (type !== 'literal') o[type] = value;
    }
    return {
      y: Number(o.year),
      mo: Number(o.month),
      d: Number(o.day),
      h: Number(o.hour),
      mi: Number(o.minute),
      s: Number(o.second),
    };
  }

  const lo = Date.UTC(y, m - 1, d) - 48 * 3600 * 1000;
  const hi = Date.UTC(y, m - 1, d) + 48 * 3600 * 1000;
  for (let t = lo; t < hi; t += 15 * 60 * 1000) {
    const L = read(t);
    if (L.y === y && L.mo === m && L.d === d && L.h === 0 && L.mi === 0 && L.s === 0) {
      return {
        startIso: new Date(t).toISOString(),
        endIso: new Date(t + 86400000).toISOString(),
      };
    }
  }

  console.warn(`adminDashboard: could not resolve midnight for ${timeZone}, falling back to UTC day`);
  const r = new Date(ref);
  const start = Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate(), 0, 0, 0, 0);
  return {
    startIso: new Date(start).toISOString(),
    endIso: new Date(start + 86400000).toISOString(),
  };
}

/**
 * Live counts from `orders` for the store's calendar "today" (not UTC midnight unless TZ=UTC).
 */
async function computeTodayFromOrders() {
  const { startIso, endIso } = businessDayStartEndIso(BUSINESS_TZ, new Date());
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('total')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .limit(10000);

  if (error) {
    console.error('getMetrics: orders today query failed:', error.message || error);
    return null;
  }

  const rows = data || [];
  const orders_today = rows.length;
  const revenue_today = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  return { orders_today, revenue_today };
}

export async function getMetrics(req, res) {
  try {
    const [todayLive, metricsResult] = await Promise.all([
      computeTodayFromOrders(),
      supabaseAdmin.from('dashboard_metrics').select('*').single(),
    ]);

    const { data, error } = metricsResult;

    let base = {};
    if (error) {
      if (error.code === 'PGRST116') {
        base = { gross_revenue: 0, total_orders: 0, total_users: 0 };
      } else {
        throw error;
      }
    } else {
      base = data || {};
    }

    // Never reuse stale "today" from materialized row — it often lags behind live totals.
    const payload = { ...base };
    delete payload.orders_today;
    delete payload.revenue_today;

    if (todayLive) {
      payload.orders_today = todayLive.orders_today;
      payload.revenue_today = todayLive.revenue_today;
    }

    res.json(payload);
  } catch (err) {
    console.error('getMetrics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard metrics' });
  }
}
