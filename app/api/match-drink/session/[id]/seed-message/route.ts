import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { validateAdminPin } from "@/lib/match-drink/storage";

const SEED_MESSAGES = [
  "Qualcuno ha del rum extra? Chiedo per un amico al tavolo 5.",
  "Il Capitano ha un fascino magnetico stasera, o è solo il fumo della cambusa?",
  "C'è una sirena al tavolo 12 o ho bevuto decisamente troppo?",
  "Ho visto un pirata molto interessante... ma non dirò a quale tavolo si trova!",
  "Spero che il mare sia calmo stasera, perché il mio cuore è in tempesta.",
  "Chiunque abbia mandato quel messaggio anonimo prima... mi hai incuriosito.",
  "Al tavolo 8 si ride troppo, scommetto che hanno trovato un tesoro.",
  "Messaggio per il biondo/a in fondo: il tuo pappagallo mi ha fatto l'occhiolino.",
  "Ma i drink qui sono magici o sono tutti bellissimi stasera?",
  "Cercasi compagno/a di scorribande per il resto della serata. Requisiti: fegato d'acciaio.",
  "Se stasera non finisce in un arrembaggio, non sono contento.",
  "Il tavolo 3 sta cercando di battere il record di shot? Chiedo per unirmi.",
];

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

    const message = SEED_MESSAGES[Math.floor(Math.random() * SEED_MESSAGES.length)];

    const supabase = getSupabaseAdmin();
    
    // Pick a random player from this session to make it look real
    const { data: players } = await supabase
      .from("match_drink_players")
      .select("id")
      .eq("session_id", sessionId);
    
    const randomPlayerId = players && players.length > 0 
      ? players[Math.floor(Math.random() * players.length)].id 
      : null;

    if (!randomPlayerId) {
       return NextResponse.json({ error: "Nessun naufrago a bordo per generare messaggi" }, { status: 400 });
    }

    const { error } = await supabase.from("match_drink_bottle_messages").insert({
      session_id: sessionId,
      player_id: randomPlayerId,
      message,
      display_mode: "anonymous",
      status: "pending",
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Seed message error:", error);
    return NextResponse.json({ error: "Errore generazione messaggio" }, { status: 500 });
  }
}
