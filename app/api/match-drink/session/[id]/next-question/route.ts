import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { updateQuestionIndex, updateStageMode } from "@/lib/match-drink/storage";
import { expectNumber, readJsonBody } from "@/lib/validation/request";

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
    const payload = await readJsonBody<{ index?: number | string }>(req);
    const index = expectNumber(payload.index, "Indice domanda", {
      integer: true,
      min: 0,
      max: 200,
    });

    await updateQuestionIndex(id, index);
    await updateStageMode(id, "question");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error advancing question:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
