import { NextResponse } from "next/server";
import { getProfileData, registerContactVisit } from "@/lib/cooperto/service";
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

    // Salviamo la visita anche nel nostro database per il cron del sondaggio
    const { saveVisitToStorage } = await import("@/lib/push/subscription-store");
    // Se contactCode contiene un @, è probabilmente l'email fallback
    const email = payload.contactCode.includes("@") ? payload.contactCode : undefined;
    await saveVisitToStorage(payload.contactCode, email).catch(() => null);

    const lookupMode = payload.contactCode.includes("@") ? "email" : "contactCode";
    const profile = await getProfileData(lookupMode, payload.contactCode).catch(() => null);
    const profileEmail = profile?.contact?.Email?.trim().toLowerCase() || email;
    if (profileEmail) {
      const { recordCustomerVisit } = await import("@/lib/profile/achievement-service");
      await recordCustomerVisit(profileEmail, result.visitDate).catch((achievementError) => {
        console.error("[Visit Registration API] Achievement evaluation failed:", achievementError);
      });
    }

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
