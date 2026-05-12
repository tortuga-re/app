import { type NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { pauseBuzzer } from "@/lib/live-buzzer/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  await pauseBuzzer();
  return NextResponse.json({ success: true });
}
