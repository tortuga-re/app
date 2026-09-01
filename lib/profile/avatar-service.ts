import { getSupabaseAdmin } from "@/lib/supabase/client";

/**
 * Recupera l'URL dell'avatar associato a un'email.
 */
export async function getCustomerAvatar(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("customer_avatars")
    .select("avatar_url")
    .eq("email", normalizedEmail)
    .single();

  if (error || !data) {
    return null;
  }

  return data.avatar_url;
}

/**
 * Salva o aggiorna l'associazione email -> avatar_url.
 */
export async function saveCustomerAvatar(email: string, avatarUrl: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase
    .from("customer_avatars")
    .upsert(
      { 
        email: normalizedEmail, 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      },
      { onConflict: "email" }
    );

  if (error) {
    console.error("Error saving customer avatar to Supabase:", error);
    throw new Error("Errore durante il salvataggio della persistenza avatar.");
  }
}
