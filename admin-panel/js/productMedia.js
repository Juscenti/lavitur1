// admin-panel/js/productMedia.js — uses REST API for product media
import { api } from "./api.js";
import { SUPABASE_URL } from "./supabaseClient.js";

/** Media list from API includes public_url */
export async function listProductMedia(productId) {
  const data = await api.get(`/admin/products/${productId}/media`);
  return Array.isArray(data) ? data : [];
}

/** Upload files via API (multipart). Option: makeFirstImagePrimary */
export async function uploadProductMedia(productId, files, { makeFirstImagePrimary = false } = {}) {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  if (makeFirstImagePrimary) form.append("makeFirstImagePrimary", "true");
  const data = await api.upload(`/admin/products/${productId}/media`, form);
  return Array.isArray(data) ? data : [];
}

export async function deleteProductMedia(mediaRow) {
  await api.delete(`/admin/products/${mediaRow.product_id}/media/${mediaRow.id}`);
}

export async function setPrimaryMedia(productId, mediaId) {
  await api.patch(`/admin/products/${productId}/media/${mediaId}/primary`);
}

/** Fallback when only file_path is available. Uses Supabase storage URL (not API_BASE). */
export function publicMediaUrl(filePath) {
  if (!filePath) return "";
  const base = (SUPABASE_URL || "").replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/product-media/${filePath}` : "";
}
