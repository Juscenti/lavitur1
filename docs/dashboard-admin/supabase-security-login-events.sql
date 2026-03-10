-- ============================================================
-- Security: login events & account flags
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

-- 1) Profile security flags

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Login events log

CREATE TABLE IF NOT EXISTS login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  geo_country TEXT,
  geo_city TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_login_events_user_created
  ON login_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_events_success_created
  ON login_events(success, created_at DESC);

COMMENT ON TABLE login_events IS 'Auth login attempts (success/failure) for security insights.';

