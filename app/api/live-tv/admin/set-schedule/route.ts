import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { readJsonBody, RequestValidationError } from "@/lib/validation/request";
import { getLiveTvState, setLiveTvSchedule } from "@/lib/live-tv/store";
import type {
  LiveTvPresetId,
  LiveTvScheduleEntry,
  StageMode,
} from "@/lib/live-tv/types";
import { LIVE_TV_PRESET_IDS, STAGE_MODE_VALUES } from "@/lib/live-tv/types";

const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

const parseScheduleEntry = (raw: unknown, index: number): LiveTvScheduleEntry => {
  if (!raw || typeof raw !== "object") {
    throw new RequestValidationError(`Voce palinsesto ${index + 1} non valida.`);
  }

  const candidate = raw as Record<string, unknown>;
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
  const startTime = typeof candidate.startTime === "string" ? candidate.startTime.trim() : "";
  const endTime = typeof candidate.endTime === "string" ? candidate.endTime.trim() : "";
  const stageMode =
    typeof candidate.stageMode === "string" &&
    STAGE_MODE_VALUES.includes(candidate.stageMode as (typeof STAGE_MODE_VALUES)[number])
      ? (candidate.stageMode as StageMode)
      : null;
  const presetId =
    typeof candidate.presetId === "string" &&
    LIVE_TV_PRESET_IDS.includes(candidate.presetId as (typeof LIVE_TV_PRESET_IDS)[number])
      ? (candidate.presetId as LiveTvPresetId)
      : null;
  const daysOfWeek = Array.isArray(candidate.daysOfWeek)
    ? candidate.daysOfWeek
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];

  if (!label) {
    throw new RequestValidationError(`Voce palinsesto ${index + 1}: label obbligatoria.`);
  }

  if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
    throw new RequestValidationError(
      `Voce palinsesto ${index + 1}: usa orari validi in formato HH:MM.`,
    );
  }

  if (!stageMode) {
    throw new RequestValidationError(`Voce palinsesto ${index + 1}: stage mode non valido.`);
  }

  if (!daysOfWeek.length) {
    throw new RequestValidationError(
      `Voce palinsesto ${index + 1}: seleziona almeno un giorno.`,
    );
  }

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id
        : randomUUID(),
    label,
    startTime,
    endTime,
    stageMode,
    presetId: stageMode === "live_tv" ? presetId : null,
    enabled: candidate.enabled !== false,
    daysOfWeek,
  };
};

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = await readJsonBody<{
      autoScheduleEnabled?: boolean;
      schedule?: unknown[];
    }>(request);

    const schedule = Array.isArray(body.schedule)
      ? body.schedule.map((entry, index) => parseScheduleEntry(entry, index))
      : [];

    await setLiveTvSchedule({
      autoScheduleEnabled: Boolean(body.autoScheduleEnabled),
      schedule,
    });

    return NextResponse.json({ success: true, state: await getLiveTvState() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof RequestValidationError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Palinsesto non valido.",
      },
      { status: error instanceof RequestValidationError ? error.status : 400 },
    );
  }
}
