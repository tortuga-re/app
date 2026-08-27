import { NextResponse } from "next/server";
import { getProfileData } from "@/lib/cooperto/service";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { normalizeProfileEmail, isValidProfileEmail } from "@/lib/profile/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;
    const nickname = body?.nickname?.trim();

    if (!email || !nickname) {
      return NextResponse.json(
        { error: "Email e nickname sono richiesti." },
        { status: 400 },
      );
    }

    const normalizedEmail = normalizeProfileEmail(email);
    if (!isValidProfileEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Indirizzo email non valido." },
        { status: 400 },
      );
    }

    if (nickname.length < 2 || nickname.length > 25) {
      return NextResponse.json(
        { error: "Il nickname deve contenere da 2 a 25 caratteri." },
        { status: 400 },
      );
    }

    // Verify Legend rank requirements on Cooperto
    const profile = await getProfileData("email", normalizedEmail);
    const visits = profile.contact?.NumeroVisite ?? 0;
    const points = profile.contact?.SaldoPuntiCard ?? 0;
    const realName = `${profile.contact?.Nome ?? ""} ${profile.contact?.Cognome ?? ""}`.trim() || "Pirati del Tortuga";

    if (visits < 20 || points < 100) {
      return NextResponse.json(
        { error: "Non soddisfi ancora i requisiti del rango Leggenda (20 visite e 100 Dobloni)." },
        { status: 403 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if they already registered
    const { data: existing } = await supabase
      .from("legends_hall_of_fame")
      .select("legend_number")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Hai già registrato un nickname nella Hall of Legends." },
        { status: 409 },
      );
    }

    // Register nickname
    const { data, error } = await supabase
      .from("legends_hall_of_fame")
      .insert({
        email: normalizedEmail,
        nickname,
        real_name: realName,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, legend: data });
  } catch (error) {
    console.error("Error registering legend nickname:", error);
    return NextResponse.json(
      { error: "Errore durante la registrazione del nickname della Leggenda." },
      { status: 500 },
    );
  }
}
