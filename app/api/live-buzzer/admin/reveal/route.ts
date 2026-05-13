import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import {
  nextLeaderboardReveal,
  showLeaderboard,
  startLeaderboardReveal,
} from "@/lib/live-buzzer/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(request);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start":
        await startLeaderboardReveal();
        break;
      case "next":
        await nextLeaderboardReveal();
        break;
      case "full":
        await showLeaderboard();
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
