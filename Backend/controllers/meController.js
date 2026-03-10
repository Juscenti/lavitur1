// Backend/controllers/meController.js — current user profile (authenticated)
import { supabaseAdmin } from '../config/supabase.js';
import { logUserActivity } from '../lib/activityLogger.js';

export async function getMe(req, res) {
  try {
    const profile = req.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      fullname: profile.full_name,
      full_name: profile.full_name,
      phone: profile.phone || "",
      bio: profile.bio || "",
      role: profile.role,
      status: profile.status,
      created_at: profile.created_at,
    });
  } catch (err) {
    console.error('getMe:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch profile' });
  }
}

export async function updateMe(req, res) {
  try {
    const userId = req.userId;
    const { username, fullname, full_name, phone, bio } = req.body;

    const updates = {};
    if (username !== undefined) updates.username = username;
    // Handle both fullname and full_name to support frontend flexibility
    if (fullname !== undefined) updates.full_name = fullname;
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Record which fields were updated for activity feed.
    logUserActivity(userId, 'profile_updated', {
      fields: Object.keys(updates),
    });

    res.json(data);
  } catch (err) {
    console.error('updateMe:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
}
