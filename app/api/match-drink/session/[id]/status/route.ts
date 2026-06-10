import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { updateSessionStatus } from "@/lib/match-drink/storage";
import { expectEnum, readJsonBody } from "@/lib/validation/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }
    const payload = await readJsonBody<{ status?: string }>(req);
    const status = expectEnum(payload.status, "Stato sessione", [
      "lobby",
      "playing",
      "matching",
      "reveal",
      "ended",
    ] as const);

    await updateSessionStatus(id, status);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating session status:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
