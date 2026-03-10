-- ============================================================
-- Promotions: discount code extensions & redemptions tracking
-- Run this in the Supabase SQL Editor for your project.
-- Assumes an existing `discount_codes` table.
-- ============================================================

-- 1) Extend discount_codes with ambassador/owner linkage and rules

ALTER TABLE discount_codes
  ADD COLUMN IF NOT EXISTS owner_profile_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS ambassador_profile_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER,                -- total max redemptions across all users
  ADD COLUMN IF NOT EXISTS max_redemptions_per_user INTEGER,   -- per-user cap
  ADD COLUMN IF NOT EXISTS min_order_total NUMERIC(12,2),      -- minimum order subtotal required
  ADD COLUMN IF NOT EXISTS is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS channel TEXT,                       -- e.g. 'instagram', 'tiktok', 'email'
  ADD COLUMN IF NOT EXISTS campaign_name TEXT;

COMMENT ON COLUMN discount_codes.owner_profile_id IS 'Staff member who owns/administers this code.';
COMMENT ON COLUMN discount_codes.ambassador_profile_id IS 'Ambassador whose performance is tracked with this code.';

-- 2) Redemptions table (linking orders to discount codes)

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  discount_amount NUMERIC(12,2) NOT NULL,        -- JMD amount discounted on this order
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_redemptions_order_code
  ON discount_redemptions(order_id, discount_code_id);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_code
  ON discount_redemptions(discount_code_id, created_at DESC);

-- 3) Ambassador performance view

CREATE OR REPLACE VIEW analytics_ambassador_performance AS
SELECT
  dc.ambassador_profile_id,
  p.full_name AS ambassador_name,
  COUNT(DISTINCT dr.order_id) AS orders_count,
  SUM(dr.discount_amount) AS total_discount_given,
  SUM(o.total) AS gross_revenue,
  MIN(o.created_at) AS first_order_at,
  MAX(o.created_at) AS last_order_at
FROM discount_redemptions dr
JOIN discount_codes dc ON dr.discount_code_id = dc.id
JOIN orders o ON dr.order_id = o.id
LEFT JOIN profiles p ON dc.ambassador_profile_id = p.id
WHERE dc.ambassador_profile_id IS NOT NULL
GROUP BY dc.ambassador_profile_id, p.full_name;

COMMENT ON VIEW analytics_ambassador_performance IS 'Summarised revenue and orders driven by each ambassador via discount codes.';

