import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import {
  setYoutubePlaylist,
  setYoutubeStatus,
  triggerYoutubeCommand,
} from "@/lib/live-buzzer/store";

export async function POST(request: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(request);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const body = await request.json();
    const { action, playlistId, playlistName, status, command, title } = body;

    if (action === "setPlaylist") {
      await setYoutubePlaylist(playlistId, playlistName);
    } else if (action === "setStatus") {
      await setYoutubeStatus(status, title);
    } else if (action === "triggerCommand") {
      await triggerYoutubeCommand(command);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
