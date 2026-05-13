import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { redeemDrink } from "@/lib/match-drink/storage";
import { expectString, readJsonBody } from "@/lib/validation/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }
    const payload = await readJsonBody<{ matchId?: string }>(req);
    const matchId = expectString(payload.matchId, "Match ID");

    await redeemDrink(matchId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error redeeming drink:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
