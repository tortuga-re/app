import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { createSession } from "@/lib/match-drink/storage";
import { expectNumber, expectString, readJsonBody } from "@/lib/validation/request";

export async function POST(req: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(req, "captain");
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const payload = await readJsonBody<{ title?: string; questionCount?: number | string }>(req);
    const title = expectString(payload.title, "Titolo sessione", {
      minLength: 3,
      maxLength: 80,
    });
    const parsedQuestionCount =
      payload.questionCount === undefined
        ? 20
        : expectNumber(payload.questionCount, "Numero domande", {
            integer: true,
            min: 5,
            max: 40,
          });

    const session = await createSession(title, parsedQuestionCount);
    
    // Invia push di attivazione
    try {
      const { sendGameStartPush } = await import("@/lib/game/activation");
      void sendGameStartPush("matchDrink");
    } catch (e) {
      console.error("Failed to send start push:", e);
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
