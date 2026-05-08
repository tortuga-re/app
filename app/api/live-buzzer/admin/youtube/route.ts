import { NextRequest, NextResponse } from "next/server";
import { setYoutubePlaylist, setYoutubeStatus, triggerYoutubeCommand } from "@/lib/live-buzzer/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, playlistId, status, command, title } = body;

    if (action === "setPlaylist") {
      setYoutubePlaylist(playlistId);
    } else if (action === "setStatus") {
      console.log("SERVER: Receiving setStatus", status, "with title:", title);
      setYoutubeStatus(status, title);
    } else if (action === "triggerCommand") {
      triggerYoutubeCommand(command);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
