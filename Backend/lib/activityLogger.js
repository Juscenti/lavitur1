// Backend/lib/activityLogger.js
// Lightweight helper to record non-critical user activity events.

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Log a user activity event.
 * Never throws — failures are logged to the console and ignored so that
 * cart / wishlist / orders / profile flows are not blocked.
 *
 * @param {string} userId
 * @param {string} type
 * @param {object} [meta]
 */
export async function logUserActivity(userId, type, meta = null) {
  try {
    if (!userId || !type) return;
    const payload = {
      user_id: userId,
      type,
      meta: meta && Object.keys(meta).length ? meta : null,
    };
    const { error } = await supabaseAdmin.from('user_activity').insert(payload);
    if (error) {
      console.warn('logUserActivity insert error:', error.message || error);
    }
  } catch (err) {
    console.warn('logUserActivity failed:', err?.message || err);
  }
}

