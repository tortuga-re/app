const parseRoomCodes = (value?: string) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const parseBooleanFlag = (value?: string) => value?.trim().toLowerCase() === "true";

export const coopertoConfig = {
  apiBaseUrl: "https://api.cooperto.it",
  apiKey: process.env.COOPERTO_API_KEY?.trim() ?? "",
  sedeCode: process.env.COOPERTO_SEDE_CODE?.trim() ?? "",
  bookingModuleCode: process.env.COOPERTO_BOOKING_MODULE_CODE?.trim() ?? "",
  bookingRoomCodes: parseRoomCodes(process.env.COOPERTO_BOOKING_ROOM_CODES),
};

export const hasCoopertoLiveConfig = Boolean(
  coopertoConfig.apiKey &&
    coopertoConfig.sedeCode &&
    coopertoConfig.bookingModuleCode,
);

export const siteConfig = {
  name: "Tortuga Bay",
  appName: "Tortuga App",
  description:
    "Prenotazioni, profilo fidelity e informazioni di sede in un'unica web app mobile-first.",
  productionUrl: "https://app.tortugabay.it",
  accent: "#b58a4d",
  accentSoft: "#f1d8a1",
};

export const pwaConfig = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "",
  pushSubscriptionsFile: process.env.PUSH_SUBSCRIPTIONS_FILE?.trim() ?? "",
  installReminderWindowMs: 1000 * 60 * 60 * 24 * 7,
  pushReminderWindowMs: 1000 * 60 * 60 * 24 * 7,
};

export const featureFlags = {
  enableTableMapSelection: parseBooleanFlag(process.env.ENABLE_TABLE_MAP_SELECTION),
};

export const tortugaRooms: Record<string, string> = {
  "da1d57f0-e0d5-4d7e-86be-9f8300f388b8": "Sala Centrale",
  "b7f34310-195e-4c03-ac05-a660e79dc1ce": "Soppalco",
  "32986b6b-4f7f-4924-a9de-c76445e1031e": "Cabina di Poppa",
  "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c": "Area Family",
};

export const storageKeys = {
  customerIdentity: "tortuga.customer-identity",
  bookingDraft: "tortuga.booking-draft",
  profileLookup: "tortuga.profile-lookup",
  lastReservation: "tortuga.last-reservation",
  installPromptDismissedAt: "tortuga.install-prompt-dismissed-at",
  pushPromptDismissedAt: "tortuga.push-prompt-dismissed-at",
} as const;
