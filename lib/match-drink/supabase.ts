import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client per operazioni pubbliche/client-side
export const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Durante il build, alcune route potrebbero essere tracciate senza variabili d'ambiente.
    // Restituiamo un client dummy o gestiamo l'errore in modo che non rompa il build
    // se non viene effettivamente usato.
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
       console.warn("Supabase credentials missing during execution");
    }
  }
  return createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder");
};

// Client sicuro lato server per operazioni amministrative
export const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Gestione build-time: non lanciamo errore qui per permettere il tracing del build
    return createClient("https://placeholder.supabase.co", "placeholder");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
