-- ============================================================
-- Loyalty program (accounts, transactions, tiers)
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance BIGINT NOT NULL DEFAULT 0,
  tier_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE loyalty_accounts IS 'Per-user loyalty account with current points balance and tier.';

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  min_points BIGINT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  benefits JSONB, -- arbitrary metadata describing perks
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_tiers_name
  ON loyalty_tiers(name);

COMMENT ON TABLE loyalty_tiers IS 'Configurable loyalty tiers (e.g. Silver, Gold, Platinum).';

ALTER TABLE loyalty_accounts
  ADD CONSTRAINT fk_loyalty_accounts_tier
  FOREIGN KEY (tier_id) REFERENCES loyalty_tiers(id);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL,  -- earn, redeem, adjustment
  points BIGINT NOT NULL,
  reason TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_created
  ON loyalty_transactions(user_id, created_at DESC);

COMMENT ON TABLE loyalty_transactions IS 'Immutable ledger of all loyalty point earns/redemptions/adjustments.';

-- Helper to maintain loyalty_accounts.points_balance
CREATE OR REPLACE FUNCTION apply_loyalty_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO loyalty_accounts (user_id, points_balance, updated_at)
  VALUES (NEW.user_id, NEW.points, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    points_balance = loyalty_accounts.points_balance + EXCLUDED.points_balance,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loyalty_transactions_apply ON loyalty_transactions;
CREATE TRIGGER trg_loyalty_transactions_apply
AFTER INSERT ON loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION apply_loyalty_transaction();

