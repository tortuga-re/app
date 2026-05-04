import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

/**
 * Recupera gli ID delle missioni sbloccate per un utente (via email).
 */
export async function getCustomerAchievements(email: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("customer_achievements")
    .select("achievement_ids")
    .eq("email", normalizedEmail)
    .single();

  if (error || !data) {
    return [];
  }

  return data.achievement_ids || [];
}

/**
 * Aggiunge una missione sbloccata alla persistenza dell'utente.
 */
export async function unlockAchievement(email: string, achievementId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  // Recuperiamo quelle attuali
  const current = await getCustomerAchievements(normalizedEmail);
  
  if (current.includes(achievementId)) {
    return; // Già sbloccata
  }

  const updated = [...current, achievementId];

  const { error } = await supabase
    .from("customer_achievements")
    .upsert(
      { 
        email: normalizedEmail, 
        achievement_ids: updated,
        updated_at: new Date().toISOString()
      },
      { onConflict: "email" }
    );

  if (error) {
    console.error("Error unlocking achievement in Supabase:", error);
    throw new Error("Errore durante il salvataggio della missione sbloccata.");
  }
}
