// Backend/controllers/adminSettingsController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function getSettings(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('key, value, category');
    if (error) throw error;

    const grouped = {};
    (data || []).forEach((row) => {
      const [section, key] = String(row.key).split('.', 2);
      if (!grouped[section]) grouped[section] = {};
      grouped[section][key || 'value'] = row.value;
    });

    res.json(grouped);
  } catch (err) {
    console.error('getSettings:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
}

export async function updateSettings(req, res) {
  try {
    const payload = req.body || {};
    const upserts = [];

    Object.entries(payload).forEach(([section, values]) => {
      if (!values || typeof values !== 'object') return;
      Object.entries(values).forEach(([name, value]) => {
        upserts.push({
          key: `${section}.${name}`,
          category: section,
          value,
          updated_at: new Date().toISOString(),
        });
      });
    });

    if (upserts.length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }

    const { error } = await supabaseAdmin.from('app_settings').upsert(upserts, { onConflict: 'key' });
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    console.error('updateSettings:', err);
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
}

