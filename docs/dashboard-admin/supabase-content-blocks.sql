-- ============================================================
-- Content blocks for storefront management (admin dashboard)
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g. 'hero', 'homepage_section', 'banner', 'faq', 'guide'
  body TEXT,          -- rich text / markdown
  media_url TEXT,     -- optional image/video
  cta_label TEXT,
  cta_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_blocks_slug
  ON content_blocks(slug);

CREATE INDEX IF NOT EXISTS idx_content_blocks_type_active
  ON content_blocks(type, is_active, sort_order);

COMMENT ON TABLE content_blocks IS 'Reusable content blocks for the storefront (hero, homepage sections, FAQs, etc.).';

-- Simple helper to keep updated_at fresh
CREATE OR REPLACE FUNCTION set_content_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_blocks_updated_at ON content_blocks;
CREATE TRIGGER trg_content_blocks_updated_at
BEFORE UPDATE ON content_blocks
FOR EACH ROW EXECUTE FUNCTION set_content_blocks_updated_at();

