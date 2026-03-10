// Backend/controllers/adminRolesController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function listRoleUsers(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .neq('role', 'customer');
    if (error) throw error;

    const users = (data || []).map((p) => ({
      id: p.id,
      full_name: p.full_name ?? p.fullName ?? '',
      email: p.email ?? '',
      role: p.role ?? '',
      is_locked: p.is_locked ?? false,
      mfa_enabled: p.mfa_enabled ?? false,
    }));

    res.json({ users });
  } catch (err) {
    console.error('listRoleUsers:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch role users' });
  }
}

export async function getRoleMatrix(req, res) {
  try {
    const [{ data: roles, error: rolesError }, { data: perms, error: permsError }] = await Promise.all([
      supabaseAdmin.from('role_definitions').select('role_key, display_name, description').order('role_key'),
      supabaseAdmin.from('role_permissions').select('role_key, resource, can_read, can_write, can_admin'),
    ]);

    if (rolesError) throw rolesError;
    if (permsError) throw permsError;

    const resourcesMap = new Map();
    (perms || []).forEach((p) => {
      if (!resourcesMap.has(p.resource)) {
        resourcesMap.set(p.resource, { resource: p.resource, permissions: {} });
      }
      const row = resourcesMap.get(p.resource);
      row.permissions[p.role_key] = {
        read: !!p.can_read,
        write: !!p.can_write,
        admin: !!p.can_admin,
      };
    });

    res.json({
      roles: roles || [],
      resources: Array.from(resourcesMap.values()),
    });
  } catch (err) {
    console.error('getRoleMatrix:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch role matrix' });
  }
}

