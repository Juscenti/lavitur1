-- Run in Supabase → SQL Editor. Makes orders/order_items easier to read (no data loss).
-- Safe to run: only adds columns and comments, creates a view.

-- ========== 1) Add at-a-glance customer columns to orders ==========
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name  TEXT;

-- Backfill from existing shipping JSONB (one-time)
UPDATE orders
SET
  customer_email = COALESCE(customer_email, shipping->>'email'),
  customer_name  = COALESCE(customer_name,  shipping->>'fullName', shipping_name)
WHERE shipping IS NOT NULL AND (customer_email IS NULL OR customer_name IS NULL);

-- ========== 2) Column comments (show in Supabase table docs / tooltips) ==========
COMMENT ON COLUMN orders.id IS 'Order ID (UUID)';
COMMENT ON COLUMN orders.user_id IS 'Customer account (auth.users / profiles)';
COMMENT ON COLUMN orders.customer_email IS 'Email used at checkout (for receipts/support)';
COMMENT ON COLUMN orders.customer_name IS 'Name used at checkout';
COMMENT ON COLUMN orders.status IS 'e.g. pending_payment, paid, shipped, delivered';
COMMENT ON COLUMN orders.total IS 'Final total (after discount)';
COMMENT ON COLUMN orders.currency IS 'e.g. JMD, USD';
COMMENT ON COLUMN orders.shipping_name IS 'Recipient name for delivery';
COMMENT ON COLUMN orders.shipping_postal IS 'Postal / ZIP code';
COMMENT ON COLUMN orders.shipping IS 'Full checkout payload (JSON): fullName, email, phone, address, city, postalCode';

COMMENT ON COLUMN order_items.order_id IS 'Parent order';
COMMENT ON COLUMN order_items.product_id IS 'Product (products.id)';
COMMENT ON COLUMN order_items.product_title IS 'Product name at time of order';
COMMENT ON COLUMN order_items.line_total IS 'unit_price × quantity';

-- ========== 3) View: columns in a logical order (optional) ==========
-- Use this view in the Table Editor or in queries when you want a readable column order.
CREATE OR REPLACE VIEW orders_readable AS
SELECT
  id,
  created_at,
  updated_at,
  status,
  user_id,
  customer_name,
  customer_email,
  total,
  currency,
  subtotal,
  discount_amount,
  discount_code_id,
  shipping_name,
  shipping_phone,
  shipping_address_line1,
  shipping_address_line2,
  shipping_city,
  shipping_parish,
  shipping_country,
  shipping_postal,
  notes,
  shipping
FROM orders
ORDER BY created_at DESC;

-- Optional: view for order + line items in one place (one row per item)
-- CREATE OR REPLACE VIEW orders_with_items_readable AS
-- SELECT o.id AS order_id, o.created_at, o.status, o.customer_name, o.customer_email, o.total,
--        oi.id AS item_id, oi.product_title, oi.quantity, oi.unit_price, oi.line_total
-- FROM orders o
-- JOIN order_items oi ON oi.order_id = o.id
-- ORDER BY o.created_at DESC, oi.created_at;
