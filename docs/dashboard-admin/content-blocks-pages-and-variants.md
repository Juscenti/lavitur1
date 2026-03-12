# Content blocks: multiple pages and variants

## Pages

Blocks can be assigned to a **Page** so the storefront can request only that page’s blocks:

- **Home** — `GET /api/content-blocks?page=home` (used by the home page).
- **Shop** — `GET /api/content-blocks?page=shop` (use this in your Shop page component to render blocks above or below the product grid).
- **Any / Global** — block is not tied to a page (included when no page filter is used).

In Dashboard → Content Management, use the **Page** dropdown when creating or editing a block. The storefront must request blocks with the same `page` query (e.g. `fetchPublicContentBlocks('shop')` on the shop route).

---

## Variants (multiple versions of a page)

You can run **multiple versions** of the same page (e.g. “default”, “summer”, “sale”) and switch which one is live.

1. **Variant field** — When editing a block, set **Variant** (e.g. `default`, `summer`, `sale`). Leave empty to treat as `default`. Only one variant is shown at a time per page.
2. **Active variant** — At the top of the Content Management page, use **Active variant (what the site shows)** to choose which variant is live for **Home** and **Shop**. The storefront always receives blocks for that active variant (and blocks with no variant are treated as `default`).

Example:

- Create blocks for **Home** with Variant = `default` (main layout).
- Duplicate or create more blocks for **Home** with Variant = `summer` (summer campaign).
- Set **Active variant** for Home to `default` or `summer`; the home page will show only blocks for that variant.

Active variant is stored in **Settings** (`app_settings` key `content.variants`). No extra setup is required.

---

## Migration

If you already have the `content_blocks` table, add the **variant** column by running:

- [supabase-content-blocks-variant-migration.sql](supabase-content-blocks-variant-migration.sql)

Then ensure **app_settings** has a row for `content.variants` (the Dashboard creates it when you change Active variant). Default is `{ "home": "default", "shop": "default" }`.
