import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use the anon (public) key from Supabase Dashboard > Project Settings > API. It is usually a long JWT (eyJ...). Replace if this is a placeholder.
const SUPABASE_URL = "https://ueotizgitowpvizkbgst.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Cv6TIwRzZVRs72-Byx2ozA_r7eDR0DX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
