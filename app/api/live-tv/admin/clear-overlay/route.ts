import { NextRequest, NextResponse } from "next/server";

import { clearOverlay, getLiveTvState } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  await clearOverlay();
  return NextResponse.json({ success: true, state: await getLiveTvState() });
}
