import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { updateSession } from "@/lib/match-drink/storage";
import { expectBoolean, readJsonBody } from "@/lib/validation/request";

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
    const payload = await readJsonBody<{ bottleMessagesEnabled?: boolean }>(req);
    const bottleMessagesEnabled = expectBoolean(
      payload.bottleMessagesEnabled,
      "Stato messaggi in bottiglia",
    );

    await updateSession(id, { bottleMessagesEnabled });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
