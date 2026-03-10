// Backend/controllers/meOrdersController.js — /api/me/orders (create + list for current user)
import { supabaseAdmin } from '../config/supabase.js';
import { logUserActivity } from '../lib/activityLogger.js';

/**
 * GET current user's cart rows with product prices (same shape as meCartController for consistency).
 */
async function getCartForOrder(userId) {
  const { data: rows, error } = await supabaseAdmin
    .from('cart_items')
    .select(`
      id,
      product_id,
      size,
      quantity,
      products ( id, title, price )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (rows || []).map((c) => {
    const qty = Number(c.quantity) || 1;
    const unitPrice = Number(c.products?.price) ?? 0;
    return {
      product_id: c.products?.id ?? c.product_id,
      product_title: c.products?.title ?? 'Unknown',
      quantity: qty,
      unit_price: unitPrice,
      line_total: Number((qty * unitPrice).toFixed(2)),
      size: c.size ?? null,
    };
  });
}

/**
 * POST /api/me/orders — create order from current cart, then clear cart.
 * Body: { fullName, email, phone?, address, city?, postalCode? }
 */
export async function createOrder(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      fullName,
      email,
      phone,
      address,
      addressLine2,
      city,
      parish,
      country,
      postalCode,
    } = req.body || {};
    if (!fullName?.trim() || !email?.trim() || !address?.trim()) {
      return res.status(400).json({ error: 'Full name, email, and address are required.' });
    }

    const cartLines = await getCartForOrder(userId);
    if (cartLines.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    const total = cartLines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
    const currency = 'JMD';

    const shipping = {
      fullName: (fullName || '').trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim() || null,
      address: (address || '').trim(),
      addressLine2: (addressLine2 || '').trim() || null,
      city: (city || '').trim() || null,
      parish: (parish || '').trim() || null,
      country: (country || '').trim() || null,
      postalCode: (postalCode || '').trim() || null,
    };

    // Insert order (customer_email, customer_name for readable admin; shipping JSONB for full payload)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending_payment',
        total: Number(total.toFixed(2)),
        currency,
        customer_email: (email || '').trim() || null,
        customer_name: (fullName || '').trim() || null,
        shipping_name: (fullName || '').trim() || null,
        shipping_phone: (phone || '').trim() || null,
        shipping_address_line1: (address || '').trim() || null,
        shipping_address_line2: (addressLine2 || '').trim() || null,
        shipping_city: (city || '').trim() || null,
        shipping_parish: (parish || '').trim() || null,
        shipping_country: (country || '').trim() || null,
        shipping_postal: (postalCode || '').trim() || null,
        shipping,
      })
      .select('id, status, total, currency, created_at')
      .single();

    if (orderError) {
      if (orderError.code === '42703' && orderError.message?.includes('shipping')) {
        return res.status(500).json({
          error: 'Orders table is missing "shipping" column. Run Backend/supabase-orders-migration.sql in Supabase SQL Editor.',
        });
      }
      throw orderError;
    }

    // Insert order_items — only columns that exist in your table: id, order_id, product_id, product_title, unit_price, quantity, line_total, created_at
    const orderItems = cartLines.map((line) => ({
      order_id: order.id,
      product_id: line.product_id,
      product_title: String(line.product_title ?? '').trim() || 'Unknown',
      unit_price: Number(line.unit_price) || 0,
      quantity: Math.max(1, Math.floor(Number(line.quantity)) || 1),
      line_total: Number((line.line_total ?? 0).toFixed(2)),
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) {
      console.error('order_items insert:', itemsError);
      const msg = itemsError.message || 'Unknown error';
      return res.status(500).json({
        error: `Order created but line items failed: ${msg}`,
      });
    }

    // Clear cart
    const { error: deleteCartError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    if (deleteCartError) console.error('clear cart after order:', deleteCartError);

    const responsePayload = {
      id: order.id,
      status: order.status,
      total: order.total,
      currency: order.currency,
      created_at: order.created_at,
    };

    // Log order placed activity (non-blocking).
    const itemsCount = cartLines.reduce(
      (sum, line) => sum + (Number(line.quantity) || 1),
      0
    );
    logUserActivity(userId, 'order_placed', {
      order_id: order.id,
      total: order.total,
      currency,
      items_count: itemsCount,
    });

    res.status(201).json(responsePayload);
  } catch (err) {
    console.error('createOrder:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
}

/**
 * GET /api/me/orders — recent orders for the current user.
 * Returns a lightweight list suitable for profile/legacy profile.js:
 * [{ id, status, total, currency, created_at, items_count }]
 */
export async function listMyOrders(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Try to include order_items so we can compute items_count; fall back gracefully if columns/table missing.
    let rows = null;
    let error = null;

    const { data: withItems, error: withItemsErr } = await supabaseAdmin
      .from('orders')
      .select(
        `
        id,
        status,
        total,
        currency,
        created_at,
        order_items ( quantity )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (withItemsErr) {
      const isColumnError =
        withItemsErr.code === '42703' ||
        withItemsErr.code === '42P01' ||
        /column .* does not exist/i.test(withItemsErr.message || '') ||
        /relation .* does not exist/i.test(withItemsErr.message || '');

      if (!isColumnError) throw withItemsErr;

      const { data: minimal, error: minimalErr } = await supabaseAdmin
        .from('orders')
        .select('id, status, total, currency, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (minimalErr) throw minimalErr;
      rows = minimal;
    } else {
      rows = withItems;
    }

    const list = (rows || []).map((o) => {
      const items = Array.isArray(o.order_items) ? o.order_items : [];
      const itemsCount =
        items.length === 0
          ? null
          : items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

      return {
        id: o.id,
        status: o.status || 'pending',
        total: Number(o.total ?? 0),
        currency: o.currency || 'JMD',
        created_at: o.created_at,
        items_count: itemsCount,
      };
    });

    res.json(list);
  } catch (err) {
    console.error('listMyOrders:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
}
