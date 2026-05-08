import { NextResponse } from "next/server";

import { getVenuesData } from "@/lib/cooperto/service";

export const revalidate = 3600; // 1 ora di cache

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

