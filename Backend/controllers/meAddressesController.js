// Backend/controllers/meAddressesController.js — /api/me/addresses
import { supabaseAdmin } from '../config/supabase.js';

/** GET /api/me/addresses — list current user's addresses (default first) */
export async function listAddresses(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('listAddresses:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch addresses' });
  }
}

/** POST /api/me/addresses — add new address. Body: { label?, full_name, phone?, address_line1, address_line2?, city?, parish?, country?, postal_code?, is_default? } */
export async function createAddress(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const isDefault = Boolean(body.is_default);

    if (isDefault) {
      await supabaseAdmin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .insert({
        user_id: userId,
        label: body.label?.trim() || null,
        full_name: (body.full_name || '').trim() || '',
        phone: body.phone?.trim() || null,
        address_line1: (body.address_line1 || '').trim() || '',
        address_line2: body.address_line2?.trim() || null,
        city: body.city?.trim() || null,
        parish: body.parish?.trim() || null,
        country: (body.country || '').trim() || null,
        postal_code: body.postal_code?.trim() || null,
        is_default: isDefault,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createAddress:', err);
    res.status(500).json({ error: err.message || 'Failed to create address' });
  }
}

/** PATCH /api/me/addresses/:id — update address */
export async function updateAddress(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const body = req.body || {};
    const isDefault = body.is_default === true;

    if (isDefault) {
      await supabaseAdmin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const updates = {
      updated_at: new Date().toISOString(),
      ...(body.label !== undefined && { label: body.label?.trim() || null }),
      ...(body.full_name !== undefined && { full_name: (body.full_name || '').trim() || '' }),
      ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
      ...(body.address_line1 !== undefined && { address_line1: (body.address_line1 || '').trim() || '' }),
      ...(body.address_line2 !== undefined && { address_line2: body.address_line2?.trim() || null }),
      ...(body.city !== undefined && { city: body.city?.trim() || null }),
      ...(body.parish !== undefined && { parish: body.parish?.trim() || null }),
      ...(body.country !== undefined && { country: (body.country || '').trim() || null }),
      ...(body.postal_code !== undefined && { postal_code: body.postal_code?.trim() || null }),
      ...(body.is_default !== undefined && { is_default: isDefault }),
    };

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Address not found' });
    res.json(data);
  } catch (err) {
    console.error('updateAddress:', err);
    res.status(500).json({ error: err.message || 'Failed to update address' });
  }
}

/** DELETE /api/me/addresses/:id */
export async function deleteAddress(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabaseAdmin
      .from('user_addresses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('deleteAddress:', err);
    res.status(500).json({ error: err.message || 'Failed to delete address' });
  }
}

/** PATCH /api/me/addresses/:id/default — set as default (primary) */
export async function setDefaultAddress(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;

    await supabaseAdmin
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', userId);

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Address not found' });
    res.json(data);
  } catch (err) {
    console.error('setDefaultAddress:', err);
    res.status(500).json({ error: err.message || 'Failed to set default address' });
  }
}
