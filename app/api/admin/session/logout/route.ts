import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearAdminSessionCookie(response);
}
