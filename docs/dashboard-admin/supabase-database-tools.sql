-- ============================================================
-- Database tools: maintenance jobs & basic stats helpers
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key TEXT NOT NULL,          -- e.g. 'recompute_dashboard_metrics'
  status TEXT NOT NULL,           -- queued, running, success, failed
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES profiles(id),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_jobs_jobkey_created
  ON maintenance_jobs(job_key, created_at DESC);

COMMENT ON TABLE maintenance_jobs IS 'Tracks background maintenance/admin jobs triggered from the dashboard.';

-- Optional helper view for basic row counts of key business tables

CREATE OR REPLACE VIEW db_table_stats AS
SELECT
  relname AS table_name,
  n_live_tup AS estimated_rows
FROM pg_stat_all_tables
WHERE schemaname = 'public'
  AND relname IN (
    'orders',
    'order_items',
    'products',
    'profiles',
    'discount_codes',
    'discount_redemptions',
    'loyalty_accounts',
    'support_tickets'
  );

COMMENT ON VIEW db_table_stats IS 'Lightweight estimated row counts for key business tables.';

