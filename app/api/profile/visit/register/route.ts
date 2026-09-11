import { NextResponse } from "next/server";
import {
  addTagsToContact,
  getProfileData,
  registerContactVisit,
} from "@/lib/cooperto/service";
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

    const lookupMode = payload.contactCode.includes("@") ? "email" : "contactCode";
    const profileBefore = await getProfileData(lookupMode, payload.contactCode).catch(() => null);
    const visitsBefore = profileBefore?.contact?.NumeroVisite ?? 0;
    const pointsBefore = profileBefore?.contact?.SaldoPuntiCard ?? 0;

    const result = await registerContactVisit({
      contactCode: payload.contactCode,
      venueCode,
    });

    await addTagsToContact({
      contactCode: payload.contactCode,
      venueCode,
      tags: ["VISITA-EFFETTUATA"],
    });

    const profileAfter = await getProfileData(lookupMode, payload.contactCode).catch(() => null);
    const visitsAfter = profileAfter?.contact?.NumeroVisite ?? 0;
    const pointsAfter = profileAfter?.contact?.SaldoPuntiCard ?? 0;

    const getRankLevel = (v: number) => {
      if (v >= 20) return 3;
      if (v >= 10) return 2;
      if (v >= 5) return 1;
      if (v >= 1) return 0;
      return -1;
    };

    const levelBefore = getRankLevel(visitsBefore);
    const levelAfter = getRankLevel(visitsAfter);

    if (levelAfter > levelBefore) {
      const levelsClimbed = levelAfter - levelBefore;
      const pointsToAward = levelsClimbed * 5;
      const { addPointsToContact } = await import("@/lib/cooperto/service");
      await addPointsToContact({
        codiceContatto: payload.contactCode,
        punti: pointsToAward,
        note: "Bonus passaggio di rango",
      }).catch((e) => {
        console.error("[Visit Registration API] Failed to add rank bonus points:", e);
      });
    }

    const { saveVisitToStorage } = await import("@/lib/push/subscription-store");
    const email = payload.contactCode.includes("@") ? payload.contactCode : undefined;
    await saveVisitToStorage(payload.contactCode, email).catch(() => null);

    const profile = profileAfter;
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
