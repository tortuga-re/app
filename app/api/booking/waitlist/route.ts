import { NextResponse } from "next/server";

import { createWaitlist } from "@/lib/cooperto/service";
import type { WaitlistCreateInput } from "@/lib/cooperto/types";
import { isValidProfileEmail } from "@/lib/profile/validation";
import {
  isValidItalianPhone,
  italianPhoneValidationError,
} from "@/lib/validation/phone";

export const dynamic = "force-dynamic";

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const validatePayload = (payload: Partial<WaitlistCreateInput>) => {
  if (!isIsoDate(payload.date ?? "")) {
    return "La data desiderata non e valida.";
  }

  if (!Number.isInteger(payload.pax) || (payload.pax ?? 0) < 1) {
    return "Il numero di persone deve essere almeno 1.";
  }

  if (!payload.firstName?.trim() || !payload.lastName?.trim()) {
    return "Nome e cognome sono obbligatori per la lista d'attesa.";
  }

  if (!payload.phone?.trim()) {
    return "Il telefono e obbligatorio per la lista d'attesa.";
  }

  if (!isValidItalianPhone(payload.phone)) {
    return italianPhoneValidationError;
  }

  if (payload.email?.trim() && !isValidProfileEmail(payload.email)) {
    return "Inserisci un indirizzo email valido.";
  }

  if (!payload.privacyAccepted) {
    return "Il consenso privacy e obbligatorio.";
  }

  return null;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | Partial<WaitlistCreateInput>
    | null;

  if (!payload) {
    return NextResponse.json(
      { error: "Payload lista d'attesa mancante o non valido." },
      { status: 400 },
    );
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const data = await createWaitlist({
      date: payload.date ?? "",
      requestedTime: payload.requestedTime?.trim() || undefined,
      pax: payload.pax ?? 1,
      roomCode: payload.roomCode?.trim() || undefined,
      firstName: payload.firstName?.trim() ?? "",
      lastName: payload.lastName?.trim() ?? "",
      phone: payload.phone?.trim() ?? "",
      email: payload.email?.trim() || undefined,
      note: payload.note?.trim() || undefined,
      privacyAccepted: Boolean(payload.privacyAccepted),
      marketingAccepted: Boolean(payload.marketingAccepted),
      moduleCode: payload.moduleCode?.trim() || undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Creazione lista d'attesa non riuscita.",
      },
      { status: 500 },
    );
  }
}
