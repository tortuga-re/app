import { NextResponse } from "next/server";

import { getLiveTvState } from "@/lib/live-tv/store";
import { getActiveSession } from "@/lib/match-drink/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [state, activeMatchDrinkSession] = await Promise.all([
      getLiveTvState(),
      getActiveSession().catch(() => null),
    ]);

    return NextResponse.json({
      ...state,
      activeMatchDrinkSessionId: activeMatchDrinkSession?.id ?? null,
    });
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
