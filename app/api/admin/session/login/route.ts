import { NextResponse } from "next/server";

import {
  attachAdminSessionCookie,
  createAdminSessionFromPin,
} from "@/lib/admin/auth";
import { measureServerOperation } from "@/lib/observability";
import { readJsonBody, expectString, RequestValidationError } from "@/lib/validation/request";
import { checkRateLimit, getClientIp, recordFailedAttempt, resetFailedAttempts } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, "admin_login");

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error },
      { status: 429 },
    );
  }

  try {
    const payload = await readJsonBody<{ pin?: string }>(request);
    const pin = expectString(payload.pin, "PIN admin", { minLength: 4, maxLength: 32 });
    const session = await measureServerOperation(
      "admin_session_login",
      async () => createAdminSessionFromPin(pin),
      { roleRequested: "captain" },
    );

    // Login con successo: reset tentativi falliti
    resetFailedAttempts(ip, "admin_login");

    const response = NextResponse.json({
      success: true,
      session: {
        role: session.role,
        label: session.label,
      },
    });

    return attachAdminSessionCookie(response, session);
  } catch (error) {
    // Registra il tentativo fallito per l'IP
    recordFailedAttempt(ip, "admin_login");

    return NextResponse.json(
      {
        error:
          error instanceof RequestValidationError
            ? error.message
            : "Accesso admin non riuscito.",
      },
      { status: error instanceof RequestValidationError ? error.status : 500 },
    );
  }
}
