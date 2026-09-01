import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseInstance: ReturnType<typeof createClient> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

/** Client pubblico riutilizzato, utilizzabile anche dai componenti client. */
export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder",
  );
  return supabaseInstance;
};

/** Client server-side riutilizzato per le operazioni amministrative. */
export const getSupabaseAdmin = () => {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return createClient("https://placeholder.supabase.co", "placeholder");
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return supabaseAdminInstance;
};
