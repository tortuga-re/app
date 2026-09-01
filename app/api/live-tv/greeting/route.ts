import { NextResponse } from "next/server";
import { validateGreetingInput } from "@/lib/live-tv/table-validation";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { checkRateLimit, getClientIp, recordFailedAttempt, resetFailedAttempts } from "@/lib/security/rate-limiter";
import { getLiveTvState } from "@/lib/live-tv/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Verifica se i saluti sono abilitati dal pannello admin
  try {
    const currentState = await getLiveTvState();
    if (currentState.greetingsEnabled === false) {
      return NextResponse.json(
        { error: "I saluti in diretta TV sono momentaneamente disattivati dal locale." },
        { status: 403 },
      );
    }
  } catch (err) {
    console.warn("[LiveTvGreeting] Impossibile verificare stato abilitazione:", err);
  }

  const ip = getClientIp(request);
  // Rate limit: max 10 saluti per IP ogni 15 minuti per prevenire spam sui display
  const rateLimit = checkRateLimit(ip, "tv_greeting", 10, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => null);
    const { nickname, tableNumber, messageType, customMessage } = body || {};

    const validation = validateGreetingInput(nickname, tableNumber, customMessage);
    if (!validation.valid) {
      recordFailedAttempt(ip, "tv_greeting", 10, 15 * 60 * 1000);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const greetingPayload = {
      id: crypto.randomUUID(),
      nickname: validation.cleanNickname,
      tableNumber: validation.cleanTableNumber,
      messageType: messageType || "brindisi",
      customMessage: validation.cleanCustomMessage || null,
      createdAt: Date.now(),
    };

    // Broadcast in tempo reale a tutti gli schermi Live TV connessi
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel("live-tv");
    
    await channel.send({
      type: "broadcast",
      event: "customer_greeting",
      payload: greetingPayload,
    });

    resetFailedAttempts(ip, "tv_greeting");

    return NextResponse.json({
      success: true,
      message: "Saluto inviato al maxi-schermo con successo!",
      greeting: greetingPayload,
    });
  } catch (error) {
    console.error("[LiveTvGreeting] Errore invio saluto:", error);
    return NextResponse.json(
      { error: "Errore durante l'invio del saluto in TV." },
      { status: 500 },
    );
  }
}
