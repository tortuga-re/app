import { NextResponse } from "next/server";

import {
  EmailChangeError,
  resendEmailChangeCode,
} from "@/lib/profile-email-change/store";
import type { EmailChangeResendPayload } from "@/lib/profile-email-change/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Partial<EmailChangeResendPayload>;

  try {
    body = (await request.json()) as Partial<EmailChangeResendPayload>;
  } catch {
    return NextResponse.json(
      { error: "Payload reinvio non valido." },
      { status: 400 },
    );
  }

  const requestId = body.requestId?.trim() ?? "";

  if (!requestId) {
    return NextResponse.json(
      { error: "Richiesta verifica non valida." },
      { status: 400 },
    );
  }

  try {
    const response = await resendEmailChangeCode(requestId);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof EmailChangeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Non sono riuscito a reinviare il codice.",
      },
      { status: 500 },
    );
  }
}
