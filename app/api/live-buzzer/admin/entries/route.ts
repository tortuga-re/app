import { type NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getState } from "@/lib/live-buzzer/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  const store = await getState();
  const entries = [...store.entries].sort((a, b) => a.relativeTimeMs - b.relativeTimeMs);

  return NextResponse.json({ entries });
}
