import { NextRequest, NextResponse } from "next/server";
import { redeemDrink, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { pin, matchId } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    if (!matchId) {
      return NextResponse.json({ error: "Match ID mancante" }, { status: 400 });
    }

    await redeemDrink(matchId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error redeeming drink:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
