-- ============================================================
-- Roles & fine-grained permissions
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

-- 1) Ensure profiles has a role column

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT;

-- Optional CHECK if you want to strictly control allowed roles.
-- Adjust as needed (add 'admin' etc.).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('owner', 'representative', 'seniour_employee', 'employee', 'ambassador', 'customer') OR role IS NULL);
  END IF;
END;
$$;

-- 2) Role definitions and permissions

CREATE TABLE IF NOT EXISTS role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL, -- e.g. 'owner', 'employee', 'ambassador'
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL REFERENCES role_definitions(role_key) ON DELETE CASCADE,
  resource TEXT NOT NULL,  -- e.g. 'page.content', 'page.analytics', 'action.orders.refund'
  can_read BOOLEAN NOT NULL DEFAULT TRUE,
  can_write BOOLEAN NOT NULL DEFAULT FALSE,
  can_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_resource
  ON role_permissions(role_key, resource);

COMMENT ON TABLE role_definitions IS 'High-level role types used throughout the admin dashboard.';
COMMENT ON TABLE role_permissions IS 'Mapping of roles to permissions for pages and actions.';

