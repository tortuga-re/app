import { NextResponse } from "next/server";

import { createBooking } from "@/lib/cooperto/service";
import type { BookingCreateInput } from "@/lib/cooperto/types";

export const dynamic = "force-dynamic";

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

const validatePayload = (payload: Partial<BookingCreateInput>) => {
  if (!isIsoDate(payload.date ?? "")) {
    return "La data prenotazione non e valida.";
  }

  if (!isTime(payload.time ?? "")) {
    return "L'orario selezionato non e valido.";
  }

  if (!Number.isInteger(payload.pax) || (payload.pax ?? 0) < 1) {
    return "Il numero di persone deve essere almeno 1.";
  }

  if (!payload.firstName?.trim() || !payload.lastName?.trim()) {
    return "Nome e cognome sono obbligatori.";
  }

  if (!payload.email?.trim() && !payload.phone?.trim()) {
    return "Inserisci almeno email o telefono.";
  }

  if (!payload.privacyAccepted) {
    return "Il consenso privacy e obbligatorio.";
  }

  return null;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | Partial<BookingCreateInput>
    | null;

  if (!payload) {
    return NextResponse.json(
      { error: "Payload prenotazione mancante o non valido." },
      { status: 400 },
    );
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const data = await createBooking(payload as BookingCreateInput);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Creazione prenotazione non riuscita.",
      },
      { status: 500 },
    );
  }
}

