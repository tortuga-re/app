import { NextRequest, NextResponse } from "next/server";

import { parseItemInput, readLiveTvAdminBody } from "@/lib/live-tv/admin";
import { getLiveTvState, replacePlaylist } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = await readLiveTvAdminBody<{ items?: Array<Record<string, unknown>> }>(request);
    const items = Array.isArray(body.items) ? body.items.map(parseItemInput) : [];
    await replacePlaylist(items);

    return NextResponse.json({ success: true, state: await getLiveTvState() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scaletta non valida." },
      { status: 400 },
    );
  }
}
