import { NextResponse } from "next/server";

import { getLiveTvState } from "@/lib/live-tv/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getLiveTvState());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stage Live TV non disponibile.",
      },
      { status: 500 },
    );
  }
}
