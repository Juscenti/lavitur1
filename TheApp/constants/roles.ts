/**
 * Profile / PATCH role values accepted by Backend `adminUsersController` ALLOWED_ROLES.
 * Order: Admin → Representative → Senior employee → Employee → Ambassador → Customer.
 */
export const ASSIGNABLE_ROLE_VALUES = [
  'admin',
  'representative',
  'senior employee',
  'employee',
  'ambassador',
  'customer',
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLE_VALUES)[number];

const ASSIGABLE_SET = new Set<string>(ASSIGNABLE_ROLE_VALUES);

function normalizedKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Map API / DB variants to the exact string the backend expects on PATCH /users/:id/role */
export function toAssignableRoleValue(raw: string): string {
  const n = normalizedKey(raw);
  const aliases: Record<string, AssignableRole> = {
    admin: 'admin',
    representative: 'representative',
    'senior employee': 'senior employee',
    'seniour employee': 'senior employee',
    employee: 'employee',
    ambassador: 'ambassador',
    customer: 'customer',
  };
  if (aliases[n]) return aliases[n];
  return raw.trim();
}

export function isAssignableRoleValue(value: string): boolean {
  return ASSIGABLE_SET.has(toAssignableRoleValue(value));
}

/** True if both refer to the same assignable role (handles senior_employee vs senior employee). */
export function rolesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return toAssignableRoleValue(a) === toAssignableRoleValue(b);
}

export function formatRoleLabel(value: string | undefined): string {
  if (!value?.trim()) return '—';
  return toAssignableRoleValue(value).replace(/_/g, ' ');
}

function dedupeSort(slugs: string[]) {
  return [...new Set(slugs.map((r) => r.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** role_definitions rows or legacy string[] from matrix API */
export function matrixRoleKeys(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  const out: string[] = [];
  for (const item of roles) {
    if (typeof item === 'string' && item.trim()) {
      out.push(toAssignableRoleValue(item));
    } else if (item && typeof item === 'object' && 'role_key' in item) {
      const k = String((item as { role_key?: string }).role_key ?? '').trim();
      if (k) out.push(toAssignableRoleValue(k));
    }
  }
  return dedupeSort(out);
}

/**
 * Full picker list: all canonical assignable roles first, then any extra keys from matrix/users
 * (forward-compatible if the backend adds roles before the app is updated).
 */
export function mergeAssignableRoleOptions(fromMatrix: string[], fromUsers: string[]): string[] {
  const extras = dedupeSort([...fromMatrix, ...fromUsers.map(toAssignableRoleValue)]).filter(
    (r) => !ASSIGABLE_SET.has(r)
  );
  return [...ASSIGNABLE_ROLE_VALUES, ...extras];
}

export function normalizeProfileRole(role: unknown): string {
  const raw = String(role ?? '').trim();
  if (!raw) return 'customer';
  const v = toAssignableRoleValue(raw);
  if (ASSIGABLE_SET.has(v)) return v;
  return raw;
}
