// admin-panel/js/supabaseClient.js
// Use the anon (public) key from Supabase Dashboard > Project Settings > API. It is usually a long JWT (eyJ...). Replace if this is a placeholder.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://ueotizgitowpvizkbgst.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Cv6TIwRzZVRs72-Byx2ozA_r7eDR0DX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Convenience: current session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Convenience: current user profile (role, username, etc.)
export async function getMyProfile() {
  const session = await getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,username,role,created_at,updated_at")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;
  return data;
}
