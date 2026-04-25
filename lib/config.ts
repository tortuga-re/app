const parseRoomCodes = (value?: string) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

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
    "Prenotazioni, ciurma fidelity e informazioni di sede in un'unica web app mobile-first.",
  productionUrl: "https://app.tortugabay.it",
  accent: "#b58a4d",
  accentSoft: "#f1d8a1",
};

export const tortugaInfoConfig = {
  address: "Via Giambattista Vico, 93 - Reggio Emilia",
  menuUrl: "https://cprt.it/a69bf",
  mapsUrl: "https://maps.app.goo.gl/ne4gvpo7QaeusxfV8",
  mapsEmbedUrl:
    "https://www.google.com/maps?q=44.733084,10.534609&z=17&output=embed",
  programmazioneUrl: "https://tortugabay.it/programmazione-invernale",
  phoneNumber: "+39 379 359 3799",
  phoneHref: "tel:+393793593799",
  whatsappHref: "https://wa.me/393793593799",
  socialLinks: [
    { label: "Instagram", href: "https://www.instagram.com/tortuga.re" },
    { label: "Facebook", href: "https://www.facebook.com/tortuga.re" },
    { label: "TikTok", href: "https://www.tiktok.com/@tortugare" },
  ],
} as const;

export const ciurmaRoadmapFeatures = [
  {
    title: "Arruola un Pirata",
    description:
      "Invita un amico nella tua ciurma e sblocca vantaggi extra quando torna a bordo.",
  },
  {
    title: "Carica la tua foto pirata",
    description:
      "Dai un volto alla tua card Tortuga con uno scatto personale in pieno stile pirata.",
  },
  {
    title: "Esperienze solo in locale",
    description:
      "Accessi speciali, contenuti dal vivo e premi pensati solo per chi passa davvero dal Tortuga.",
  },
] as const;

export const pwaConfig = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "",
  pushSubscriptionsFile: process.env.PUSH_SUBSCRIPTIONS_FILE?.trim() ?? "",
  installReminderWindowMs: 1000 * 60 * 60 * 24 * 7,
  pushReminderWindowMs: 1000 * 60 * 60 * 24 * 7,
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
  menuAccessExpiresAt: "tortuga.menu-access-expires-at",
  installPromptDismissedAt: "tortuga.install-prompt-dismissed-at",
  pushPromptDismissedAt: "tortuga.push-prompt-dismissed-at",
} as const;
