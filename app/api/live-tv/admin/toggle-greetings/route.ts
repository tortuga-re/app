import { NextRequest, NextResponse } from "next/server";
import { setLiveTvGreetingsEnabled, getLiveTvState } from "@/lib/live-tv/store";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = await request.json().catch(() => null);
    const { enabled } = body || {};

    await setLiveTvGreetingsEnabled(Boolean(enabled));
    return NextResponse.json({ success: true, state: await getLiveTvState() });
  } catch (error) {
    console.error("[ToggleGreetings] Errore aggiornamento stato saluti:", error);
    return NextResponse.json(
      { error: "Errore durante l'aggiornamento dei saluti in TV." },
      { status: 500 },
    );
  }
}
