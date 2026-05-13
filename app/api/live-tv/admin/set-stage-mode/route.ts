import { NextRequest, NextResponse } from "next/server";

import { parseStageMode, readLiveTvAdminBody } from "@/lib/live-tv/admin";
import { getLiveTvState, setStageMode } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = await readLiveTvAdminBody<{ stageMode?: string }>(request);
    await setStageMode(parseStageMode(body.stageMode));

    return NextResponse.json({ success: true, state: await getLiveTvState() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stage mode non valido." },
      { status: 400 },
    );
  }
}
