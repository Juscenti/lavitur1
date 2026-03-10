// Backend/controllers/meActivityController.js — /api/me/activity (authenticated)

import { supabaseAdmin } from '../config/supabase.js';

function formatDescription(row) {
  const type = row.type || 'activity';
  const meta = row.meta || {};

  switch (type) {
    case 'cart_added': {
      const qty = meta.quantity || 1;
      const name = meta.product_title || meta.name || 'an item';
      const size = meta.size ? ` (size ${meta.size})` : '';
      return `Added ${name}${size} to cart ×${qty}.`;
    }
    case 'cart_quantity_updated': {
      const qty = meta.quantity || 1;
      const name = meta.product_title || meta.name || 'an item';
      return `Updated cart quantity for ${name} to ${qty}.`;
    }
    case 'cart_item_removed': {
      const name = meta.product_title || meta.name || 'an item';
      return `Removed ${name} from cart.`;
    }
    case 'wishlist_added': {
      const name = meta.product_title || meta.name || 'an item';
      return `Added ${name} to wishlist.`;
    }
    case 'wishlist_removed': {
      const name = meta.product_title || meta.name || 'an item';
      return `Removed ${name} from wishlist.`;
    }
    case 'order_placed': {
      const total = typeof meta.total === 'number' ? meta.total.toFixed(2) : null;
      const items = meta.items_count || meta.items || null;
      if (total && items) {
        return `Placed an order for ${items} item${items === 1 ? '' : 's'} (total JMD ${total}).`;
      }
      if (total) return `Placed an order (total JMD ${total}).`;
      return 'Placed an order.';
    }
    case 'profile_updated': {
      const fields = Array.isArray(meta.fields) ? meta.fields : [];
      if (fields.length) {
        return `Updated profile details (${fields.join(', ')}).`;
      }
      return 'Updated profile details.';
    }
    case 'avatar_updated':
      return 'Updated profile picture.';
    case 'address_added': {
      const label = meta.label || 'address';
      return `Added a new ${label}.`;
    }
    case 'address_updated': {
      const label = meta.label || 'address';
      return `Updated ${label}.`;
    }
    case 'address_removed': {
      const label = meta.label || 'address';
      return `Removed ${label}.`;
    }
    case 'address_set_default': {
      const label = meta.label || 'address';
      return `Set ${label} as default address.`;
    }
    default:
      return meta.description || 'Did something on Lavitúr.';
  }
}

/** GET /api/me/activity — recent activity for the current user */
export async function listMyActivity(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Soft retention: purge entries older than 30 days for this user.
    // This is best-effort and non-blocking for the response below.
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from('user_activity')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoff);
    } catch (cleanupErr) {
      console.warn('listMyActivity cleanup (30d) failed:', cleanupErr?.message || cleanupErr);
    }

    const { data, error } = await supabaseAdmin
      .from('user_activity')
      .select('id, type, meta, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const list = (data || []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      description: formatDescription(row),
    }));

    res.json(list);
  } catch (err) {
    console.error('listMyActivity:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch activity' });
  }
}

