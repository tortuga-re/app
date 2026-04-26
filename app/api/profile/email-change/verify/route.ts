import { NextResponse } from "next/server";

import { updateProfileContact } from "@/lib/cooperto/service";
import {
  EmailChangeError,
  verifyEmailChangeCode,
} from "@/lib/profile-email-change/store";
import type { EmailChangeVerifyPayload } from "@/lib/profile-email-change/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Partial<EmailChangeVerifyPayload>;

  try {
    body = (await request.json()) as Partial<EmailChangeVerifyPayload>;
  } catch {
    return NextResponse.json(
      { error: "Payload verifica codice non valido." },
      { status: 400 },
    );
  }

  const requestId = body.requestId?.trim() ?? "";
  const code = body.code?.trim() ?? "";

  if (!requestId || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Inserisci il codice a 6 cifre." },
      { status: 400 },
    );
  }

  try {
    const record = await verifyEmailChangeCode({ requestId, code });
    const response = await updateProfileContact(record.profile);

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
            : "Non sono riuscito a verificare la nuova email.",
      },
      { status: 500 },
    );
  }
}
