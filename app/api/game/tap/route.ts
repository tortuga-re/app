import { NextResponse } from "next/server";

import {
  CaptainChallengeError,
  resolveCaptainChallengeTap,
} from "@/lib/game/engine";
import type { CaptainChallengeTapInput } from "@/lib/game/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | Partial<CaptainChallengeTapInput>
    | null;

  if (!payload) {
    return NextResponse.json(
      { error: "Payload gioco mancante o non valido." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(resolveCaptainChallengeTap(payload.gameId));
  } catch (error) {
    if (error instanceof CaptainChallengeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Tap non validabile al momento." },
      { status: 500 },
    );
  }
}
