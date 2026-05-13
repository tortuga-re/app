import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { forceStageCompatibilityMode } from "@/lib/live-tv/store";
import { updateStageMode } from "@/lib/match-drink/storage";
import type { MatchDrinkSession } from "@/lib/match-drink/types";
import {
  expectEnum,
  expectOptionalString,
  readJsonBody,
} from "@/lib/validation/request";

const allowedStageModes = [
  "lobby",
  "intro",
  "question",
  "question_results",
  "matching",
  "reveal",
  "message",
  "ended",
] as const satisfies readonly MatchDrinkSession["stageMode"][];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const payload = await readJsonBody<{
      stageMode?: string;
      currentStageMessageId?: string;
    }>(req);

    const stageMode = expectEnum(
      payload.stageMode,
      "Modalita stage",
      allowedStageModes,
    );
    const currentStageMessageId = expectOptionalString(
      payload.currentStageMessageId,
      "Messaggio stage",
      { maxLength: 100 },
    );

    await updateStageMode(id, stageMode, currentStageMessageId);
    if (stageMode !== "ended") {
      await forceStageCompatibilityMode("match_drink");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating stage mode:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
