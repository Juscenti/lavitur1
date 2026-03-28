import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const SUPABASE_URL =
  (extra.SUPABASE_URL as string | undefined) || 'https://ueotizgitowpvizkbgst.supabase.co';
export const SUPABASE_ANON_KEY =
  (extra.SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_Cv6TIwRzZVRs72-Byx2ozA_r7eDR0DX';

export const BACKEND_URL =
  (() => {
    const defaultRender = 'https://lavitur.onrender.com';
    const resolved = (extra.API_BASE as string | undefined) || defaultRender;
    // Enforce "no localhost" so app always targets the deployed Render backend.
    const isLocal =
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(resolved) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(resolved);
    return isLocal ? defaultRender : resolved;
  })();
export const ADMIN_API = `${BACKEND_URL}/api/admin`;
