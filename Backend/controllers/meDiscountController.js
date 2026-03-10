// Backend/controllers/meDiscountController.js — validate discount code for checkout
import { supabaseAdmin } from '../config/supabase.js';

/** If the date is at midnight (00:00:00), return end of that day (23:59:59.999) so "end date" means "valid through end of day". */
function getValidityEndMoment(isoOrDate) {
  if (!isoOrDate) return null;
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return null;
  const u = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (!u) return d;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** Code is valid only if now >= starts_at (and if starts_at is midnight, that's start of day). */
function isAfterStart(startsAt) {
  if (!startsAt) return true;
  const start = new Date(startsAt);
  return !Number.isNaN(start.getTime()) && Date.now() >= start.getTime();
}

/** Code is valid only if now <= end of validity (end date at midnight = end of that day). */
function isBeforeEnd(endsAt) {
  if (!endsAt) return true;
  const end = getValidityEndMoment(endsAt);
  return end !== null && Date.now() <= end.getTime();
}

/**
 * Validate a discount code for a given subtotal. Used at checkout to show discount and when placing order.
 * Returns { valid, discount_code_id?, code?, discount_percent?, discount_amount?, message? }
 */
export async function validateDiscount(req, res) {
  try {
    const { code, subtotal } = req.body || {};
    const subTotal = Number(subtotal);
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return res.json({ valid: false, message: 'Please enter a discount code.' });
    }
    if (Number.isNaN(subTotal) || subTotal < 0) {
      return res.json({ valid: false, message: 'Invalid subtotal.' });
    }

    const codeTrim = code.trim().toUpperCase();
    const { data: row, error } = await supabaseAdmin
      .from('discount_codes')
      .select('id, code, discount_percent, active, starts_at, ends_at, usage_limit, used_count, min_order_total')
      .ilike('code', codeTrim)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') return res.json({ valid: false, message: 'Discount codes are not configured.' });
      throw error;
    }
    if (!row) {
      return res.json({ valid: false, message: 'Invalid or expired discount code.' });
    }

    if (row.active === false) {
      return res.json({ valid: false, message: 'This discount code is no longer active.' });
    }

    if (!isAfterStart(row.starts_at)) {
      return res.json({ valid: false, message: 'This code is not valid yet.' });
    }
    if (!isBeforeEnd(row.ends_at)) {
      return res.json({ valid: false, message: 'This discount code has expired.' });
    }

    const usageLimit = row.usage_limit != null ? Number(row.usage_limit) : null;
    if (usageLimit != null && usageLimit > 0) {
      const used = Number(row.used_count ?? 0);
      if (used >= usageLimit) {
        return res.json({ valid: false, message: 'This code has reached its usage limit.' });
      }
    }

    const minOrder = row.min_order_total != null ? Number(row.min_order_total) : null;
    if (minOrder != null && minOrder > 0 && subTotal < minOrder) {
      return res.json({
        valid: false,
        message: `This code requires a minimum order of JMD ${Number(minOrder).toFixed(0)}.`,
      });
    }

    const percent = Number(row.discount_percent) ?? 0;
    const discountAmount = Number((subTotal * (percent / 100)).toFixed(2));

    return res.json({
      valid: true,
      discount_code_id: row.id,
      code: row.code,
      discount_percent: percent,
      discount_amount: discountAmount,
    });
  } catch (err) {
    console.error('validateDiscount:', err);
    res.status(500).json({ error: err.message || 'Failed to validate discount code' });
  }
}
