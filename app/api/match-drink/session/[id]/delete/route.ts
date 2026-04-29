import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { pin } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Delete session (cascade will handle players, answers, messages, matches)
    const { error } = await supabase
      .from("match_drink_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json({ error: "Errore durante l'eliminazione della sessione" }, { status: 500 });
  }
}
