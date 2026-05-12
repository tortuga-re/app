import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import {
  addSavedPlaylist,
  deleteSavedPlaylist,
  getSavedPlaylists,
} from "@/lib/live-buzzer/supabase-playlists";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const unauthorizedResponse = requireAdminRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const playlists = await getSavedPlaylists();
    return NextResponse.json({ playlists });
  } catch {
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const unauthorizedResponse = requireAdminRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const body = await request.json();
    const { action, name, playlistId, id } = body;

    if (action === "add") {
      if (!name || !playlistId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      const newPlaylist = await addSavedPlaylist(name, playlistId);
      if (!newPlaylist) {
        throw new Error("Failed to add playlist");
      }

      return NextResponse.json({ success: true, playlist: newPlaylist });
    }

    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const success = await deleteSavedPlaylist(id);
      if (!success) {
        throw new Error("Failed to delete playlist");
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
