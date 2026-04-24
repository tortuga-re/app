import { NextResponse } from "next/server";

import { getBookingBootstrap } from "@/lib/cooperto/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getBookingBootstrap();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bootstrap prenotazione non disponibile.",
      },
      { status: 500 },
    );
  }
}

