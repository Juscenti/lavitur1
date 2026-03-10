-- ============================================================
-- User Activity Feed (Profile Recent Activity)
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

-- 1) Activity table: one row per user event
CREATE TABLE IF NOT EXISTS user_activity (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_created
  ON user_activity (user_id, created_at DESC);

-- 2) Enable Row Level Security
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- 3) Policies
-- Users can read only their own activity.
DROP POLICY IF EXISTS "Users read own activity" ON user_activity;
CREATE POLICY "Users read own activity"
  ON user_activity
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts are done from the backend using the service role key.
-- You generally do NOT want client-side inserts into this table,
-- so we do not create an INSERT policy here.

