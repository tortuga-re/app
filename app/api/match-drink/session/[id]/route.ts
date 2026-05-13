import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { deleteSessionData, getSession } from "@/lib/match-drink/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }
    const session = await getSession(id);

    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRequest = requireAdminRequest(req, "captain");
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    await deleteSessionData(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
