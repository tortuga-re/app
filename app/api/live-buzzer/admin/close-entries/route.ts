import { type NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { closeEntries } from "@/lib/live-buzzer/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  await closeEntries();
  return NextResponse.json({ success: true });
}
