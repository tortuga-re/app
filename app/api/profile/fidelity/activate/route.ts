import { NextResponse } from "next/server";

import { activateFidelityCard } from "@/lib/cooperto/service";
import type { FidelityActivationResponse } from "@/lib/cooperto/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const cleanText = (value?: string) => value?.trim() ?? "";
const automaticActivationError =
  "Non siamo riusciti ad attivare la card in automatico. Chiedi a un pirata.";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | Partial<{ contactCode: string }>
    | null;
  const contactCode = cleanText(payload?.contactCode);

  if (!contactCode) {
    return NextResponse.json(
      { error: "Codice contatto mancante." },
      { status: 400 },
    );
  }

  try {
    const response: FidelityActivationResponse = await activateFidelityCard({
      contactCode,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Tortuga fidelity] attivazione card fallita", {
      message:
        error instanceof Error
          ? error.message
          : "Errore sconosciuto attivazione fidelity.",
    });

    return NextResponse.json(
      {
        error: automaticActivationError,
      },
      { status: 400 },
    );
  }
}
