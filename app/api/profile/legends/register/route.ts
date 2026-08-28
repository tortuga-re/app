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
    const realName = profile.contact?.Nome?.trim() || "Pirata";

    if (visits < 20 || points < 100) {
      return NextResponse.json(
        { error: "Non soddisfi ancora i requisiti del rango Leggenda (20 visite e 100 Dobloni)." },
        { status: 403 },
      );
    }

    const supabase = getSupabaseAdmin();
    let useFallbackStorage = false;
    let existing: any = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("legends_hall_of_fame")
        .select("legend_number")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (fetchError) {
        if (fetchError.message?.includes("Invalid API key") || fetchError.message?.includes("API key")) {
          useFallbackStorage = true;
        } else {
          throw fetchError;
        }
      } else {
        existing = data;
      }
    } catch (err) {
      console.error("Supabase legend check failed, using local storage:", err);
      useFallbackStorage = true;
    }

    const fs = require("fs");
    const path = require("path");
    const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
    const LOCAL_LEGENDS_FILE = path.join(LOCAL_DATA_DIR, "legends.json");

    function readLocalLegends(): any[] {
      try {
        if (!fs.existsSync(LOCAL_LEGENDS_FILE)) return [];
        const content = fs.readFileSync(LOCAL_LEGENDS_FILE, "utf8");
        return JSON.parse(content) || [];
      } catch (err) {
        return [];
      }
    }

    function writeLocalLegends(list: any[]) {
      try {
        if (!fs.existsSync(LOCAL_DATA_DIR)) {
          fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(LOCAL_LEGENDS_FILE, JSON.stringify(list, null, 2), "utf8");
      } catch (err) {
        console.error("Error writing local legends:", err);
      }
    }

    if (useFallbackStorage) {
      const localList = readLocalLegends();
      const alreadyRegistered = localList.find((l) => l.email === normalizedEmail);
      if (alreadyRegistered) {
        return NextResponse.json(
          { error: "Hai già registrato un nickname nella Hall of Legends." },
          { status: 409 },
        );
      }

      // Generate a new legend number based on list length
      const legendNumber = localList.length + 1;
      const newLegend = {
        email: normalizedEmail,
        nickname,
        real_name: realName,
        legend_number: legendNumber,
        unlocked_at: new Date().toISOString(),
      };

      localList.push(newLegend);
      writeLocalLegends(localList);

      return NextResponse.json({ success: true, legend: newLegend });
    }

    if (existing) {
      return NextResponse.json(
        { error: "Hai già registrato un nickname nella Hall of Legends." },
        { status: 409 },
      );
    }

    // Register nickname in Supabase
    let insertResult = await supabase
      .from("legends_hall_of_fame")
      .insert({
        email: normalizedEmail,
        nickname,
        real_name: realName,
      })
      .select()
      .maybeSingle();

    if (insertResult.error) {
      // If the remote schema doesn't have 'real_name' column, retry without it
      if (insertResult.error.message?.includes("real_name") || insertResult.error.hint?.includes("real_name")) {
        console.warn("Supabase does not have 'real_name' column, retrying without it...");
        insertResult = await supabase
          .from("legends_hall_of_fame")
          .insert({
            email: normalizedEmail,
            nickname,
          })
          .select()
          .maybeSingle();
      }
    }

    if (insertResult.error) {
      throw insertResult.error;
    }

    return NextResponse.json({ success: true, legend: insertResult.data });
  } catch (error) {
    console.error("Error registering legend nickname:", error);
    return NextResponse.json(
      { error: "Errore durante la registrazione del nickname della Leggenda." },
      { status: 500 },
    );
  }
}
