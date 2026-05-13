import "server-only";

import { type NextRequest, NextResponse } from "next/server";

import {
  type AdminRole,
  getAdminSession,
  hasAdminRole,
} from "@/lib/admin/auth";

export const requireAdminRequest = (
  request: NextRequest,
  requiredRole: AdminRole = "staff",
) => {
  const session = getAdminSession(request);

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Sessione admin non attiva." },
        { status: 401 },
      ),
    };
  }

  if (!hasAdminRole(session, requiredRole)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Accesso negato." }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    session,
  } as const;
};
