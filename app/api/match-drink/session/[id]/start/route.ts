import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { updateSessionStatus, updateStageMode } from "@/lib/match-drink/storage";

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

    await updateSessionStatus(id, "playing");
    await updateStageMode(id, "intro");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
