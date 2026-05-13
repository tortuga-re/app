import { NextRequest, NextResponse } from "next/server";

import { getLiveTvState, resetLiveTvDefaults } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  await resetLiveTvDefaults();
  return NextResponse.json({ success: true, state: await getLiveTvState() });
}
