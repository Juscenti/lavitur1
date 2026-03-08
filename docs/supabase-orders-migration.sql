-- Run in Supabase → SQL Editor. Aligns with Backend/controllers/meOrdersController.js.
-- Your `orders` table already has: id, user_id, status, total, currency, shipping_*, created_at, updated_at.
-- Your `order_items` table already has: id, order_id, product_id, product_title, unit_price, quantity, line_total, created_at.

-- 1) Ensure orders can store checkout payload (JSONB). Skip if you use only shipping_* columns.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping JSONB DEFAULT NULL;

-- 2) If order_items does NOT exist yet, create it to match the backend insert shape:
--    order_id, product_id, product_title, unit_price, quantity, line_total
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL DEFAULT '',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 3) Optional: add size to order_items if you want to store variant (run only if your table already exists and has no size column)
-- ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT;
