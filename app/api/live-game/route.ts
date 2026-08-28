import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import type { LiveGameState } from "@/lib/live-game";
export const dynamic = "force-dynamic";
export async function GET() { const { data, error } = await getSupabaseAdmin().from("live_game_state").select("active_game,activated_at,expires_at").eq("id", true).maybeSingle(); const game = data as LiveGameState | null; if (error || !game?.active_game || !game.expires_at || Date.parse(game.expires_at) <= Date.now()) return NextResponse.json({ game: null }); return NextResponse.json({ game }); }
