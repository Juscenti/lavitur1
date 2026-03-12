// Backend/controllers/contentBlocksController.js — public storefront API (no auth)
import { supabaseAdmin } from '../config/supabase.js';

/** Get active variant for a page from app_settings (content.variants). */
async function getActiveVariantForPage(page) {
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'content.variants')
    .maybeSingle();
  const variants = data?.value && typeof data.value === 'object' ? data.value : {};
  return variants[page] ?? 'default';
}

/**
 * GET /api/content-blocks?page=home
 * Returns active content blocks for the storefront.
 * - If page is set: only blocks for that page whose variant matches the active variant for the page (or variant is null).
 * - Active variant per page comes from app_settings key "content.variants" (e.g. { "home": "summer", "shop": "default" }).
 */
export async function listPublicContentBlocks(req, res) {
  try {
    const pageParam = req.query.page;
    const pageFilter = pageParam && String(pageParam).trim() ? String(pageParam).trim() : null;

    const { data, error } = await supabaseAdmin
      .from('content_blocks')
      .select('id, slug, title, type, body, media_url, cta_label, cta_url, sort_order, page, variant')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    let list = Array.isArray(data) ? data : [];
    if (pageFilter) {
      const activeVariant = await getActiveVariantForPage(pageFilter);
      list = list.filter((b) => {
        if (b.page != null && b.page !== pageFilter) return false;
        if (b.page === pageFilter) {
          const blockVariant = b.variant ?? 'default';
          return blockVariant === activeVariant;
        }
        return true;
      });
    }

    res.json(list);
  } catch (err) {
    console.error('listPublicContentBlocks:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch content blocks' });
  }
}
