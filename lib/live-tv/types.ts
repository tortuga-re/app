export const STAGE_MODE_VALUES = [
  "live_tv",
  "buzzer",
  "match_drink",
  "blackout",
  "logo",
] as const;

export type StageMode = (typeof STAGE_MODE_VALUES)[number];

export const LIVE_TV_ITEM_TYPES = [
  "logo",
  "message",
  "qr",
  "image",
  "video",
  "event",
  "promo",
  "review",
] as const;

export type LiveTvItemType = (typeof LIVE_TV_ITEM_TYPES)[number];

export const LIVE_TV_STYLE_VARIANTS = [
  "default",
  "urgent",
  "gold",
  "dark",
  "review",
  "promo",
] as const;

export type LiveTvStyleVariant = (typeof LIVE_TV_STYLE_VARIANTS)[number];

export const LIVE_TV_OVERLAY_VARIANTS = [
  "default",
  "urgent",
  "success",
  "captain",
] as const;

export type LiveTvOverlayVariant = (typeof LIVE_TV_OVERLAY_VARIANTS)[number];

export const LIVE_TV_PRESET_IDS = [
  "generica",
  "mercoledi_burger",
  "giovedi_match_drink",
  "venerdi_kantaquiz",
  "sabato_notte_capitano",
  "domenica_cervellone",
] as const;

export type LiveTvPresetId = (typeof LIVE_TV_PRESET_IDS)[number];

export type LiveTvItem = {
  id: string;
  type: LiveTvItemType;
  title?: string;
  subtitle?: string;
  body?: string;
  mediaUrl?: string;
  qrUrl?: string;
  qrLabel?: string;
  durationSeconds: number;
  enabled: boolean;
  order: number;
  styleVariant?: LiveTvStyleVariant;
  createdAt: string;
  updatedAt: string;
};

export type LiveTvOverlay = {
  id: string;
  message: string;
  variant: LiveTvOverlayVariant;
  expiresAt?: string | null;
};

export type LiveTvMediaAsset = {
  id: string;
  kind: "image" | "video";
  title: string;
  originalName: string;
  fileName: string;
  mediaUrl: string;
  mimeType: string;
  sizeBytes: number;
  storageMode: "external" | "public";
  createdAt: string;
};

export type LiveTvScheduleEntry = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  stageMode: StageMode;
  presetId?: LiveTvPresetId | null;
  enabled: boolean;
};

export type LiveTvState = {
  stageMode: StageMode;
  activePresetId?: LiveTvPresetId | null;
  playlist: LiveTvItem[];
  currentItemIndex: number;
  currentItemStartedAt: string;
  nowPlayingOverride?: LiveTvItem | null;
  nowPlayingStartedAt?: string | null;
  overlay?: LiveTvOverlay | null;
  isBlackout?: boolean;
  autoReturnAfterBuzzer?: boolean;
  autoReturnAfterMatchDrink?: boolean;
  autoScheduleEnabled?: boolean;
  activeScheduleId?: string | null;
  schedule?: LiveTvScheduleEntry[];
  lastUpdateId: number | string;
  updatedAt: string;
};

export type LiveTvPresetDefinition = {
  id: LiveTvPresetId;
  label: string;
  description: string;
};

export type LiveTvUpsertItemInput = {
  type: LiveTvItemType;
  title?: string;
  subtitle?: string;
  body?: string;
  mediaUrl?: string;
  qrUrl?: string;
  qrLabel?: string;
  durationSeconds: number;
  enabled: boolean;
  order?: number;
  styleVariant?: LiveTvStyleVariant;
};
