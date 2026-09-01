import { NextResponse } from "next/server";

import {
  attachAdminSessionCookie,
  createAdminSessionFromPin,
} from "@/lib/admin/auth";
import {
  expectString,
  readJsonBody,
  RequestValidationError,
} from "@/lib/validation/request";
import { checkRateLimit, getClientIp, recordFailedAttempt, resetFailedAttempts } from "@/lib/security/rate-limiter";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, "admin_login");

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: rateLimit.error },
      { status: 429 },
    );
  }

  try {
    const payload = await readJsonBody<{ pin?: string }>(request);
    const pin = expectString(payload.pin, "PIN admin", { minLength: 4, maxLength: 32 });
    const session = createAdminSessionFromPin(pin);
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
    recordFailedAttempt(ip, "admin_login");

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof RequestValidationError
            ? error.message
            : "Verifica PIN non riuscita.",
      },
      { status: error instanceof RequestValidationError ? error.status : 500 },
    );
  }
}
