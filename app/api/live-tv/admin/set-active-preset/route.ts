import { NextRequest, NextResponse } from "next/server";

import { parsePresetId, readLiveTvAdminBody } from "@/lib/live-tv/admin";
import { getLiveTvState, setActivePreset } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = await readLiveTvAdminBody<{ presetId?: string }>(request);
    await setActivePreset(parsePresetId(body.presetId));

    return NextResponse.json({ success: true, state: await getLiveTvState() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preset non valido." },
      { status: 400 },
    );
  }
}
