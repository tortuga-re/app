import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { getVenuesData } from "@/lib/cooperto/service";

export const dynamic = "force-dynamic";
const getCachedVenues = unstable_cache(getVenuesData, ["cooperto-venues"], { revalidate: 3600 });

export async function GET() {
  try {
    const data = await getCachedVenues();
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

