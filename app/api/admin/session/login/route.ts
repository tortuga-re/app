import { NextResponse } from "next/server";

import {
  attachAdminSessionCookie,
  createAdminSessionFromPin,
} from "@/lib/admin/auth";
import { measureServerOperation } from "@/lib/observability";
import { readJsonBody, expectString, RequestValidationError } from "@/lib/validation/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<{ pin?: string }>(request);
    const pin = expectString(payload.pin, "PIN admin", { minLength: 4, maxLength: 32 });
    const session = await measureServerOperation(
      "admin_session_login",
      async () => createAdminSessionFromPin(pin),
      { roleRequested: "captain" },
    );

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
        error:
          error instanceof RequestValidationError
            ? error.message
            : "Accesso admin non riuscito.",
      },
      { status: error instanceof RequestValidationError ? error.status : 500 },
    );
  }
}
