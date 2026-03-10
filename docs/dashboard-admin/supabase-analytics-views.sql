-- ============================================================
-- Analytics helpers built on top of existing tables
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

-- Daily revenue/orders summary (if you prefer a view over a materialized table)

CREATE OR REPLACE VIEW analytics_daily_orders AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS orders_count,
  SUM(total) AS gross_revenue
FROM orders
GROUP BY date_trunc('day', created_at)
ORDER BY day DESC;

COMMENT ON VIEW analytics_daily_orders IS 'Simple daily orders and revenue summary.';

-- Top products by revenue

CREATE OR REPLACE VIEW analytics_top_products AS
SELECT
  oi.product_id,
  p.name,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
GROUP BY oi.product_id, p.name
ORDER BY revenue DESC;

COMMENT ON VIEW analytics_top_products IS 'Lifetime top products by revenue and units sold.';

