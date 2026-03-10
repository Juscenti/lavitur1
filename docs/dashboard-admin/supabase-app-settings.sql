-- ============================================================
-- Application-wide settings (admin Settings page)
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL, -- e.g. 'general', 'checkout', 'shipping', 'loyalty', 'notifications'
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_app_settings_category
  ON app_settings(category);

COMMENT ON TABLE app_settings IS 'Key/value configuration for global storefront and business settings.';

