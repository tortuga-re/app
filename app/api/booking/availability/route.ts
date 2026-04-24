import { NextResponse } from "next/server";

import { getBookingAvailability } from "@/lib/cooperto/service";

export const dynamic = "force-dynamic";

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const pax = Number(searchParams.get("pax") ?? "0");
  const roomCode = searchParams.get("roomCode") ?? undefined;

  if (!isIsoDate(date)) {
    return NextResponse.json(
      { error: "La data deve essere nel formato YYYY-MM-DD." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(pax) || pax < 1) {
    return NextResponse.json(
      { error: "Il numero di persone deve essere almeno 1." },
      { status: 400 },
    );
  }

  try {
    const data = await getBookingAvailability(date, pax, roomCode);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Disponibilita non recuperabile.",
      },
      { status: 500 },
    );
  }
}

