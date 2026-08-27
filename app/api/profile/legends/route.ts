import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("legends_hall_of_fame")
      .select("nickname, legend_number, unlocked_at")
      .order("legend_number", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ legends: data ?? [] });
  } catch (error) {
    console.error("Error fetching legends:", error);
    return NextResponse.json(
      { error: "Impossibile recuperare la Hall of Legends." },
      { status: 500 },
    );
  }
}
