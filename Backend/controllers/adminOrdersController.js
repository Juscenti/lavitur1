// Backend/controllers/adminOrdersController.js
import { supabaseAdmin } from '../config/supabase.js';

// Full select when your orders table has migration columns (customer_*, shipping_*, notes, shipping JSONB)
const ORDER_SELECT_FULL = `
  id,
  status,
  total,
  currency,
  created_at,
  updated_at,
  user_id,
  customer_name,
  customer_email,
  shipping_name,
  shipping_phone,
  shipping_address_line1,
  shipping_address_line2,
  shipping_city,
  shipping_parish,
  shipping_country,
  shipping_postal,
  notes,
  shipping,
  order_items (
    id,
    product_title,
    quantity,
    unit_price,
    line_total
  )
`;

// Minimal select that works even without migration columns (core + order_items only)
const ORDER_SELECT_MINIMAL = `
  id,
  status,
  total,
  currency,
  created_at,
  updated_at,
  user_id,
  order_items (
    id,
    product_title,
    quantity,
    unit_price,
    line_total
  )
`;

function normalizeOrder(o) {
  return {
    ...o,
    order_items: Array.isArray(o?.order_items) ? o.order_items : [],
  };
}

export async function listOrders(req, res) {
  try {
    let data = null;
    let error = null;
    const { data: fullData, error: fullError } = await supabaseAdmin
      .from('orders')
      .select(ORDER_SELECT_FULL)
      .order('created_at', { ascending: false });
    if (fullError) {
      const isColumnError = fullError.code === '42703' || /column .* does not exist/i.test(fullError.message || '');
      if (isColumnError) {
        const { data: minData, error: minError } = await supabaseAdmin
          .from('orders')
          .select(ORDER_SELECT_MINIMAL)
          .order('created_at', { ascending: false });
        if (minError) throw minError;
        data = minData;
      } else {
        throw fullError;
      }
    } else {
      data = fullData;
    }
    res.json((data || []).map(normalizeOrder));
  } catch (err) {
    console.error('listOrders:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
}

export async function getOrder(req, res) {
  try {
    const { id } = req.params;
    let data = null;
    let error = null;
    const { data: fullData, error: fullError } = await supabaseAdmin
      .from('orders')
      .select(ORDER_SELECT_FULL)
      .eq('id', id)
      .single();
    if (fullError) {
      if (fullError.code === 'PGRST116') return res.status(404).json({ error: 'Order not found' });
      const isColumnError = fullError.code === '42703' || /column .* does not exist/i.test(fullError.message || '');
      if (isColumnError) {
        const { data: minData, error: minError } = await supabaseAdmin
          .from('orders')
          .select(ORDER_SELECT_MINIMAL)
          .eq('id', id)
          .single();
        if (minError) {
          if (minError.code === 'PGRST116') return res.status(404).json({ error: 'Order not found' });
          throw minError;
        }
        data = minData;
      } else {
        throw fullError;
      }
    } else {
      data = fullData;
    }
    res.json(normalizeOrder(data));
  } catch (err) {
    console.error('getOrder:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch order' });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { error } = await supabaseAdmin.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true, status });
  } catch (err) {
    console.error('updateOrderStatus:', err);
    res.status(500).json({ error: err.message || 'Failed to update order' });
  }
}

/** Admin: delete order. Requires confirm=DELETE in query or body. Deletes order_items first (FK), then order. */
export async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    const confirm = req.query.confirm || (req.body && req.body.confirm);
    if (confirm !== 'DELETE') {
      return res.status(400).json({
        error: 'Deletion requires confirmation. Add ?confirm=DELETE to the request.',
      });
    }

    // Delete line items first (FK from order_items to orders)
    const { error: itemsError } = await supabaseAdmin.from('order_items').delete().eq('order_id', id);
    if (itemsError) {
      // If table missing or RLS blocks, try deleting order anyway (DB may cascade)
      if (itemsError.code !== '42P01' && itemsError.code !== '42501') throw itemsError;
    }

    const { error: orderError } = await supabaseAdmin.from('orders').delete().eq('id', id);
    if (orderError) {
      console.error('deleteOrder orderError:', orderError);
      return res.status(500).json({ error: orderError.message || 'Failed to delete order' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('deleteOrder:', err);
    res.status(500).json({ error: err.message || 'Failed to delete order' });
  }
}
