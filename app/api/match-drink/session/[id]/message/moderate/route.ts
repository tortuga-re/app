import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { moderateMessage, updateStageMode } from "@/lib/match-drink/storage";
import { expectOptionalString, expectString, readJsonBody } from "@/lib/validation/request";

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
    const payload = await readJsonBody<{
      messageId?: string;
      action?: string;
      approvedText?: string;
    }>(req);
    const messageId = expectString(payload.messageId, "Messaggio");
    const action = expectString(payload.action, "Azione moderazione");
    const approvedText = expectOptionalString(payload.approvedText, "Testo approvato", {
      maxLength: 500,
    });

    const status = (action === "approved" || action === "approve") ? "approved" : 
                   (action === "rejected" || action === "reject") ? "rejected" : 
                   (action === "shown" || action === "show") ? "shown" : null;

    if (status) {
      await moderateMessage(messageId, status as any, approvedText); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (status === "shown") {
        await updateStageMode(id, "message", messageId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error moderating message:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
