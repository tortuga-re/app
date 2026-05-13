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

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<{ pin?: string }>(request);
    const pin = expectString(payload.pin, "PIN admin", { minLength: 4, maxLength: 32 });
    const session = createAdminSessionFromPin(pin);
    const response = NextResponse.json({
      success: true,
      session: {
        role: session.role,
        label: session.label,
      },
    });

    return attachAdminSessionCookie(response, session);
  } catch (error) {
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
