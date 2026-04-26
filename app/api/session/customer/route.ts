import { type NextRequest, NextResponse } from "next/server";

import {
  attachCustomerSessionCookie,
  clearCustomerSessionCookie,
  customerSessionMaxAgeSeconds,
  getCustomerSession,
  normalizeCustomerSessionIdentity,
} from "@/lib/session/customer-session";
import type {
  CustomerSessionIdentity,
  CustomerSessionResponse,
} from "@/lib/session/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = getCustomerSession(request);

  if (!identity) {
    return NextResponse.json<CustomerSessionResponse>(
      {
        identity: null,
        expiresInSeconds: 0,
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json<CustomerSessionResponse>({
    identity,
    expiresInSeconds: customerSessionMaxAgeSeconds,
  });

  return attachCustomerSessionCookie(response, identity);
}

export async function POST(request: NextRequest) {
  let payload: Partial<CustomerSessionIdentity>;

  try {
    payload = (await request.json()) as Partial<CustomerSessionIdentity>;
  } catch {
    return NextResponse.json(
      { error: "Payload sessione cliente non valido." },
      { status: 400 },
    );
  }

  const identity = normalizeCustomerSessionIdentity(payload);

  if (!identity) {
    return NextResponse.json(
      { error: "Email cliente non valida." },
      { status: 400 },
    );
  }

  try {
    const response = NextResponse.json<CustomerSessionResponse>({
      identity,
      expiresInSeconds: customerSessionMaxAgeSeconds,
    });

    return attachCustomerSessionCookie(response, identity);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sessione cliente non disponibile.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  return clearCustomerSessionCookie(
    NextResponse.json<CustomerSessionResponse>({
      identity: null,
      expiresInSeconds: 0,
    }),
  );
}
