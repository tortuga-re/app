import { NextResponse } from "next/server";
import { registerContactVisit } from "@/lib/cooperto/service";
import { coopertoConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      contactCode: string;
      venueCode?: string;
    } | null;

    if (!payload?.contactCode) {
      return NextResponse.json(
        { error: "Codice contatto mancante." },
        { status: 400 },
      );
    }

    const venueCode = payload.venueCode || coopertoConfig.sedeCode;

    if (!venueCode) {
      return NextResponse.json(
        { error: "Codice sede non configurato." },
        { status: 400 },
      );
    }

    const result = await registerContactVisit({
      contactCode: payload.contactCode,
      venueCode,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Visit Registration API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Registrazione visita fallita.",
      },
      { status: 500 },
    );
  }
}
