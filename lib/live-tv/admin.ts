import {
  expectBoolean,
  expectEnum,
  expectNumber,
  expectOptionalString,
  expectString,
  readJsonBody,
  RequestValidationError,
} from "@/lib/validation/request";

import type {
  LiveTvItem,
  LiveTvOverlay,
  LiveTvPresetId,
  LiveTvUpsertItemInput,
  StageMode,
} from "./types";
import {
  LIVE_TV_ITEM_TYPES,
  LIVE_TV_OVERLAY_VARIANTS,
  LIVE_TV_PRESET_IDS,
  LIVE_TV_STYLE_VARIANTS,
  STAGE_MODE_VALUES,
} from "./types";

export const readLiveTvAdminBody = <T>(request: Request) => readJsonBody<T>(request);

export const parseStageMode = (value: unknown): StageMode =>
  expectEnum(value, "Stage mode", STAGE_MODE_VALUES);

export const parsePresetId = (value: unknown): LiveTvPresetId =>
  expectEnum(value, "Preset", LIVE_TV_PRESET_IDS);

export const parseItemInput = (
  payload: Record<string, unknown>,
): LiveTvUpsertItemInput => {
  const type = expectEnum(payload.type, "Tipo elemento", LIVE_TV_ITEM_TYPES);
  const durationSeconds = expectNumber(payload.durationSeconds, "Durata", {
    integer: true,
    min: 5,
    max: 240,
  });
  const enabled = expectBoolean(payload.enabled, "Stato elemento", true);
  const order =
    payload.order === undefined
      ? undefined
      : expectNumber(payload.order, "Ordine", { integer: true, min: 0, max: 999 });

  const styleVariant =
    payload.styleVariant === undefined || payload.styleVariant === null || payload.styleVariant === ""
      ? undefined
      : expectEnum(payload.styleVariant, "Stile", LIVE_TV_STYLE_VARIANTS);

  const title = expectOptionalString(payload.title, "Titolo", { maxLength: 120 });
  const body = expectOptionalString(payload.body, "Testo", { maxLength: 600 });
  const mediaUrl = expectOptionalString(payload.mediaUrl, "Media URL", { maxLength: 500 });
  const qrUrl = expectOptionalString(payload.qrUrl, "QR URL", { maxLength: 500 });
  const qrLabel = expectOptionalString(payload.qrLabel, "QR label", { maxLength: 80 });

  if ((type === "qr" || qrUrl) && !qrUrl) {
    throw new RequestValidationError("Per un item QR serve un link valido.");
  }

  if ((type === "image" || type === "video") && !mediaUrl) {
    throw new RequestValidationError("Per immagini e video serve mediaUrl.");
  }

  return {
    type,
    title,
    body,
    mediaUrl,
    qrUrl,
    qrLabel,
    durationSeconds,
    enabled,
    order,
    styleVariant,
  };
};

export const parseItemUpdatePayload = (
  payload: Record<string, unknown>,
): {
  id: string;
  patch: Partial<LiveTvItem>;
} => {
  const id = expectString(payload.id, "ID elemento");
  const itemPatch = parseItemInput(payload);

  return {
    id,
    patch: itemPatch,
  };
};

export const parseDeletePayload = (payload: Record<string, unknown>) =>
  expectString(payload.id, "ID elemento");

export const parseTogglePayload = (payload: Record<string, unknown>) => ({
  id: expectString(payload.id, "ID elemento"),
  enabled: expectBoolean(payload.enabled, "Stato elemento"),
});

export const parseReorderPayload = (payload: Record<string, unknown>) => {
  const ids = Array.isArray(payload.ids) ? payload.ids : null;

  if (!ids || !ids.length) {
    throw new RequestValidationError("Serve una lista di ID per riordinare la scaletta.");
  }

  return ids.map((id, index) =>
    expectString(id, `ID ordine ${index + 1}`),
  );
};

export const parseSendNowPayload = (payload: Record<string, unknown>) => ({
  item: parseItemInput(payload),
  addToPlaylist: expectBoolean(payload.addToPlaylist, "Aggiunta alla scaletta", false),
});

export const parseOverlayPayload = (
  payload: Record<string, unknown>,
): LiveTvOverlay => {
  const message = expectString(payload.message, "Messaggio overlay", {
    minLength: 2,
    maxLength: 220,
  });
  const variant =
    payload.variant === undefined || payload.variant === null || payload.variant === ""
      ? "default"
      : expectEnum(payload.variant, "Variante overlay", LIVE_TV_OVERLAY_VARIANTS);
  const expiresAt = expectOptionalString(payload.expiresAt, "Scadenza overlay", {
    maxLength: 80,
  });

  if (expiresAt) {
    const parsed = new Date(expiresAt).toISOString();
    return {
      id: payload.id && typeof payload.id === "string" ? payload.id : crypto.randomUUID(),
      message,
      variant,
      expiresAt: parsed,
    };
  }

  return {
    id: payload.id && typeof payload.id === "string" ? payload.id : crypto.randomUUID(),
    message,
    variant,
    expiresAt: null,
  };
};
