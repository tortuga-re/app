import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { deleteSessionData } from "@/lib/match-drink/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const adminRequest = requireAdminRequest(req, "captain");
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    // Delete session and all related data using centralized logic
    await deleteSessionData(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json({ error: "Errore durante l'eliminazione della sessione" }, { status: 500 });
  }
}
