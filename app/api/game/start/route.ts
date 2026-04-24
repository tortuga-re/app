import { NextResponse } from "next/server";

import { startCaptainChallenge } from "@/lib/game/engine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(startCaptainChallenge());
  } catch {
    return NextResponse.json(
      { error: "Non siamo riusciti ad avviare la sfida." },
      { status: 500 },
    );
  }
}
