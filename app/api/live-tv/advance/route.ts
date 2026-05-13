import { NextRequest, NextResponse } from "next/server";

import { readLiveTvAdminBody } from "@/lib/live-tv/admin";
import { advanceLiveTv } from "@/lib/live-tv/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await readLiveTvAdminBody<{
      expectedIndex?: number;
      expectedStartedAt?: string;
      expectedOverrideStartedAt?: string;
    }>(request);

    const state = await advanceLiveTv({
      expectedIndex: typeof body.expectedIndex === "number" ? body.expectedIndex : undefined,
      expectedStartedAt: body.expectedStartedAt,
      expectedOverrideStartedAt: body.expectedOverrideStartedAt,
    });

    return NextResponse.json({ success: true, state });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Non sono riuscito ad avanzare la scaletta.",
      },
      { status: 400 },
    );
  }
}
