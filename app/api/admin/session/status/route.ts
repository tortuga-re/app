import { NextRequest, NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getAdminSession(request);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    session: {
      role: session.role,
      label: session.label,
    },
  });
}
