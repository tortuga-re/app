import { NextRequest, NextResponse } from "next/server";

import { parseReorderPayload, readLiveTvAdminBody } from "@/lib/live-tv/admin";
import { getLiveTvState, reorderPlaylist } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = await readLiveTvAdminBody<Record<string, unknown>>(request);
    await reorderPlaylist(parseReorderPayload(body));

    return NextResponse.json({ success: true, state: await getLiveTvState() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ordine non valido." },
      { status: 400 },
    );
  }
}
