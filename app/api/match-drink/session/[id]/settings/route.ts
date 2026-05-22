import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { updateSession } from "@/lib/match-drink/storage";
import { expectBoolean, readJsonBody, RequestValidationError } from "@/lib/validation/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }
    const payload = await readJsonBody<{
      bottleMessagesEnabled?: boolean;
      excludedMeetingTables?: string[];
      secondaryTraitMode?: "macro_category" | "absolute";
    }>(req);

    const updates: {
      bottleMessagesEnabled?: boolean;
      excludedMeetingTables?: string[];
      secondaryTraitMode?: "macro_category" | "absolute";
    } = {};

    if ("bottleMessagesEnabled" in payload) {
      updates.bottleMessagesEnabled = expectBoolean(
        payload.bottleMessagesEnabled,
        "Stato messaggi in bottiglia",
      );
    }

    if ("excludedMeetingTables" in payload) {
      if (!Array.isArray(payload.excludedMeetingTables)) {
        throw new RequestValidationError("Lista tavoli esclusi non valida.");
      }

      updates.excludedMeetingTables = payload.excludedMeetingTables.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      );
    }

    if ("secondaryTraitMode" in payload) {
      const value = payload.secondaryTraitMode;
      if (value !== "macro_category" && value !== "absolute") {
        throw new RequestValidationError("Modalità trait secondario non valida.");
      }
      updates.secondaryTraitMode = value;
    }

    await updateSession(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
