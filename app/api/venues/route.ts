import { NextResponse } from "next/server";

import { getVenuesData } from "@/lib/cooperto/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getVenuesData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Elenco sedi non disponibile.",
      },
      { status: 500 },
    );
  }
}

