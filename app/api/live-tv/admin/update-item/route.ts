import { NextRequest, NextResponse } from "next/server";

import { parseItemUpdatePayload, readLiveTvAdminBody } from "@/lib/live-tv/admin";
import { getLiveTvState, updatePlaylistItem } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = await readLiveTvAdminBody<Record<string, unknown>>(request);
    const { id, patch } = parseItemUpdatePayload(body);
    await updatePlaylistItem(id, patch);

    return NextResponse.json({ success: true, state: await getLiveTvState() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aggiornamento non valido." },
      { status: 400 },
    );
  }
}
