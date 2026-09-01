import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { listHighlightBackgroundAssets } from "@/lib/highlights/background-library";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json({ assets: await listHighlightBackgroundAssets() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Libreria degli sfondi non disponibile.",
      },
      { status: 500 },
    );
  }
}
