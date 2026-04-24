import { NextResponse } from "next/server";

import { getProfileData, updateProfileContact } from "@/lib/cooperto/service";
import type { ProfileUpdateInput } from "@/lib/cooperto/types";

export const dynamic = "force-dynamic";

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
const isValidEmail = (value?: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const query = searchParams.get("query")?.trim() ?? "";

  if (mode !== "email" && mode !== "contactCode") {
    return NextResponse.json(
      { error: "La modalita di ricerca deve essere `email` o `contactCode`." },
      { status: 400 },
    );
  }

  if (!query) {
    return NextResponse.json(
      { error: "Inserisci una chiave di ricerca valida." },
      { status: 400 },
    );
  }

  try {
    const data = await getProfileData(mode, query);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Profilo non disponibile.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let payload: ProfileUpdateInput;

  try {
    payload = (await request.json()) as ProfileUpdateInput;
  } catch {
    return NextResponse.json(
      { error: "Payload profilo non valido." },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeEmail(payload.email);

  if (!payload.firstName?.trim() || !payload.lastName?.trim()) {
    return NextResponse.json(
      { error: "Inserisci nome e cognome." },
      { status: 400 },
    );
  }

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Inserisci un indirizzo email valido." },
      { status: 400 },
    );
  }

  if (!payload.phone?.trim()) {
    return NextResponse.json(
      { error: "Inserisci un numero di telefono valido." },
      { status: 400 },
    );
  }

  if (payload.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)) {
    return NextResponse.json(
      { error: "La data di nascita non e valida." },
      { status: 400 },
    );
  }

  try {
    const data = await updateProfileContact({
      ...payload,
      email: normalizedEmail,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Aggiornamento profilo non disponibile.",
      },
      { status: 500 },
    );
  }
}
