import { type NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { listPushHistory } from "@/lib/push/history-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) return adminRequest.response;

  try {
    return NextResponse.json({ history: await listPushHistory(20) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Storico push non disponibile.",
      },
      { status: 500 },
    );
  }
}
