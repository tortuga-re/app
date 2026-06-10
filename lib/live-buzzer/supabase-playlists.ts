import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

export type BuzzerPlaylist = {
  id: string;
  name: string;
  playlist_id: string;
  created_at: string;
};

export async function getSavedPlaylists(): Promise<BuzzerPlaylist[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("buzzer_playlists")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }
  return data || [];
}

export async function addSavedPlaylist(name: string, playlistId: string): Promise<BuzzerPlaylist | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("buzzer_playlists")
    .insert([{ name, playlist_id: playlistId }])
    .select()
    .single();

  if (error) {
    console.error("Error adding playlist:", error);
    return null;
  }
  return data;
}

export async function deleteSavedPlaylist(id: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("buzzer_playlists")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting playlist:", error);
    return false;
  }
  return true;
}
