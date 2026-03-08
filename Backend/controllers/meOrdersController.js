// Backend/controllers/meOrdersController.js — POST /api/me/orders (create order from cart)
import { supabaseAdmin } from '../config/supabase.js';

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

    const { fullName, email, phone, address, city, postalCode } = req.body || {};
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
      city: (city || '').trim() || null,
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
        shipping_city: (city || '').trim() || null,
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

    res.status(201).json({
      id: order.id,
      status: order.status,
      total: order.total,
      currency: order.currency,
      created_at: order.created_at,
    });
  } catch (err) {
    console.error('createOrder:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
}
