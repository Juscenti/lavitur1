import { useCallback, useState } from 'react';
import { api } from '../lib/api';
import { matrixRoleKeys, mergeAssignableRoleOptions } from '../constants/roles';

interface RoleMatrix {
  roles: unknown;
  resources?: unknown[];
}

/**
 * Assignable roles for PATCH /users/:id/role:
 * 1) Canonical six roles (admin … customer) always included.
 * 2) Union with `role_key` from GET /roles/matrix (role_definitions) and unique roles from GET /users`.
 * 3) On failure → empty list + `rolesError` (picker hidden / error state).
 */
export function useRoleOptions() {
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refreshRoles = useCallback(async () => {
    setError(null);
    try {
      const m = await api.get<RoleMatrix>('/roles/matrix');
      const fromMatrix = matrixRoleKeys(m?.roles);

      const res = await api.get<unknown>('/users');
      const arr = Array.isArray(res) ? res : (res as { users?: unknown[] })?.users ?? [];
      const fromUsers: string[] = [];
      for (const u of arr) {
        const r = (u as { role?: string })?.role;
        if (typeof r === 'string' && r.trim()) fromUsers.push(r.trim());
      }

      setRoles(mergeAssignableRoleOptions(fromMatrix, fromUsers));
    } catch (e: unknown) {
      setRoles([]);
      setError(e instanceof Error ? e.message : 'Failed to load roles');
    } finally {
      setLoaded(true);
    }
  }, []);

  return { roleOptions: roles, rolesLoaded: loaded, rolesError: error, refreshRoles };
}
