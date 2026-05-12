import "server-only";

import { type NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/live-buzzer/admin";
import { getCustomerSession } from "@/lib/session/customer-session";

export const requireAdminRequest = (request: NextRequest) => {
  const session = getCustomerSession(request);

  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  }

  return null;
};
