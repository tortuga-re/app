import { NextResponse } from "next/server";

import { getProfileData, updateProfileContact } from "@/lib/cooperto/service";
import type { ProfileUpdateInput } from "@/lib/cooperto/types";
import {
  isValidProfileEmail,
  normalizeProfileEmail,
  normalizeProfileUpdateInput,
  validateProfileUpdateInput,
} from "@/lib/profile/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const query = searchParams.get("query")?.trim() ?? "";

  if (mode !== "email" && mode !== "contactCode") {
    return NextResponse.json(
      { error: "La modalita di ricerca deve essere `email` o `contactCode`." },
      { status: 400 },
    );
  }

  if (!query) {
    return NextResponse.json(
      { error: "Inserisci una chiave di ricerca valida." },
      { status: 400 },
    );
  }

  const normalizedQuery = mode === "email" ? normalizeProfileEmail(query) : query;

  if (mode === "email" && !isValidProfileEmail(normalizedQuery)) {
    return NextResponse.json(
      { error: "Inserisci un indirizzo email valido." },
      { status: 400 },
    );
  }

  try {
    const data = await getProfileData(mode, normalizedQuery);
    
    // Se la ricerca è per email, cerchiamo anche l'avatar e le missioni sbloccate su Supabase
    if (mode === "email") {
      const { getCustomerAvatar } = await import("@/lib/profile/avatar-service");
      const { evaluateCustomerAchievements } = await import("@/lib/profile/achievement-service");
      const { getSupabaseAdmin } = await import("@/lib/match-drink/supabase");
      
      const [avatarUrl, achievementState, legendResult] = await Promise.all([
        getCustomerAvatar(normalizedQuery).catch(() => null),
        evaluateCustomerAchievements(normalizedQuery, data).catch(() => ({ achievementIds: [] as string[], achievementViews: [] })),
        getSupabaseAdmin()
          .from("legends_hall_of_fame")
          .select("nickname, legend_number")
          .eq("email", normalizedQuery)
          .maybeSingle(),
      ]);

      if (avatarUrl) {
        data.avatarUrl = avatarUrl;
      }
      data.unlockedAchievementIds = achievementState.achievementIds;
      data.achievementViews = achievementState.achievementViews;

      if (legendResult?.data) {
        data.legendNickname = legendResult.data.nickname;
        data.legendNumber = legendResult.data.legend_number;
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Profilo non disponibile.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload profilo non valido." },
      { status: 400 },
    );
  }

  const payload: ProfileUpdateInput = normalizeProfileUpdateInput(rawPayload);
  const validationError = validateProfileUpdateInput(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  console.info(`[API Profile POST] Richiesta salvataggio per: ${payload.email}`, {
    name: `${payload.firstName} ${payload.lastName}`,
    hasBirthDate: Boolean(payload.birthDate),
  });

  try {
    const data = await updateProfileContact({
      ...payload,
    });
    console.info(`[API Profile POST] Successo per: ${payload.email}`, {
      source: data.source,
      hasContact: Boolean(data.contact),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API Profile POST] Errore per: ${payload.email}`, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Aggiornamento profilo non disponibile.",
      },
      { status: 500 },
    );
  }
}
