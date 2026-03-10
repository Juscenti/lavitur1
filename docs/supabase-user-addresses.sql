-- Run in Supabase → SQL Editor.
-- Lets users save multiple addresses and choose one at checkout (default + switch).
-- Country is worldwide; no default. If you already created the table with DEFAULT 'Jamaica', run:
--   ALTER TABLE user_addresses ALTER COLUMN country DROP DEFAULT;

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT,
  city TEXT,
  parish TEXT,
  country TEXT,
  postal_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_default
  ON user_addresses(user_id) WHERE is_default = true;

COMMENT ON TABLE user_addresses IS 'Saved addresses per user; one can be default for checkout.';
