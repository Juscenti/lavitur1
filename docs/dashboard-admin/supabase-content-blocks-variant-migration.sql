-- Add optional variant column to content_blocks (run after page migration)
-- Variant allows multiple "versions" of a page (e.g. default, summer, sale).
-- Active variant per page is stored in app_settings (key: content.variants, value: { "home": "default", "shop": "summer" }).

ALTER TABLE content_blocks
  ADD COLUMN IF NOT EXISTS variant TEXT;

COMMENT ON COLUMN content_blocks.variant IS 'Optional variant name. Only blocks matching the page active variant (or variant IS NULL) are returned for the storefront.';

CREATE INDEX IF NOT EXISTS idx_content_blocks_page_variant
  ON content_blocks(page, variant) WHERE page IS NOT NULL;
