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
  defaultFidelityCardCode:
    process.env.COOPERTO_DEFAULT_FIDELITY_CARD_CODE?.trim() ?? "",
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
  logoUrl: "https://tortugabay.it/wp-content/uploads/2025/08/cropped-TORTUGA-FAVICON-SMALL.png",
  ogImageUrl: "https://tortugabay.it/wp-content/uploads/2026/05/LOGO-TORTUGA-2.png",
};

export const analyticsConfig = {
  gtmId: process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-5G5QFPBF",
  metaPixelId:
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1168283681896161",
  siteArea: "app",
  appDomain: "app.tortugabay.it",
  eventSource: "tortuga_web_app",
} as const;

export const tortugaInfoConfig = {
  address: "Via Giambattista Vico, 93 - Reggio Emilia",
  menuUrl: "https://cprt.it/a69bf",
  mapsUrl: "https://maps.app.goo.gl/ne4gvpo7QaeusxfV8",
  mapsEmbedUrl:
    "https://www.google.com/maps?q=44.733084,10.534609&z=17&output=embed",
  programmazioneUrl: "https://tortugabay.it/programmazione-invernale",
  eveningProgram: [
    {
      id: "perla-nera-day",
      weekday: 3,
      day: "MERCOLEDÌ",
      title: "PERLA NERA DAY 2x1",
      description:
        "Il più venduto del Tortuga, oltre 600 al mese, in formula 2x1.",
      imageUrl:
        "https://tortugabay.it/wp-content/uploads/2026/06/perla-nera-day-mercoledi-tortuga-reggio-emilia.png",
      detailUrl: "https://tortugabay.it/mercoledi",
    },
    {
      id: "the-social-game",
      weekday: 4,
      day: "GIOVEDÌ",
      title: "THE SOCIAL GAME",
      description:
        "Vuoi conoscere persone con i tuoi stessi interessi? Tra una risposta e l'altra, potrebbe nascere anche qualcosa di romantico.",
      imageUrl:
        "https://tortugabay.it/wp-content/uploads/2026/06/giovedi-the-social-game-tortuga-nuove-amicizie-e-conoscenze-a-reggio-emilia.png",
      detailUrl: "https://tortugabay.it/giovedi",
    },
    {
      id: "kantaquiz",
      weekday: 5,
      day: "VENERDÌ",
      title: "KANTAQUIZ",
      description:
        "Quiz, musica, risate e gente che si scatena. Non è solo cena: è il venerdì del Tortuga.",
      imageUrl:
        "https://tortugabay.it/wp-content/uploads/2026/06/venerdi-kanta-quiz-tortuga-reggio-emilia.png",
      detailUrl: "https://tortugabay.it/venerdi",
    },
    {
      id: "notte-del-capitano",
      weekday: 6,
      day: "SABATO",
      title: "LA NOTTE DEL CAPITANO",
      description: "Atmosfera, gioco, musica e ciurma pronta a fare casino.",
      imageUrl:
        "https://tortugabay.it/wp-content/uploads/2026/06/sabato-notte-del-capitano-cena-con-spettacolo-karaoke-tortuga-reggio-emilia.png",
      detailUrl: "https://tortugabay.it/sabato",
    },
    {
      id: "cervellone",
      weekday: 0,
      day: "DOMENICA",
      title: "CERVELLONE DAY",
      description:
        "La domenica si chiude con amici e famigliari: tavoli, sfide e cervelli messi alla prova fino all’ultima risposta.",
      imageUrl:
        "https://tortugabay.it/wp-content/uploads/2026/06/domenica-cervellone-day-quiz-sfida-amici-e-familiari-tortuga-reggio-emilia.png",
      detailUrl: undefined,
    },
  ],
  phoneNumber: "+39 379 359 3799",
  phoneHref: "tel:+393793593799",
  whatsappHref: "https://wa.me/393793593799",
  socialLinks: [
    { label: "Instagram", href: "https://www.instagram.com/tortuga.re" },
    { label: "Facebook", href: "https://www.facebook.com/tortuga.re" },
    { label: "TikTok", href: "https://www.tiktok.com/@tortugare" },
  ],
  reviews: [
    {
      author: "Andrea M.",
      source: "Google",
      rating: 5,
      text: "Atmosfera fantastica e personale super accogliente! Gli hamburger sono spettacolari e le serate a tema con il karaoke rendono ogni cena un'esperienza divertente. Il posto perfetto per festeggiare con gli amici!",
    },
    {
      author: "Simona R.",
      source: "TripAdvisor",
      rating: 5,
      text: "Locale originale e molto curato. Ci siamo stati per una festa di compleanno e siamo rimasti colpiti dalla cortesia dello staff e dalla qualità del cibo (pinse ottime!). Divertimento assicurato.",
    },
    {
      author: "Marco P.",
      source: "Google",
      rating: 5,
      text: "Un punto di riferimento a Reggio Emilia per chi cerca una serata diversa. Ottimo cibo, musica e tanta allegria. Consigliatissimo per chi vuole staccare la spina e farsi due risate in compagnia.",
    },
  ],
} as const;

export const localExperiencePublicConfig = {
  claimPath: "/esperienze-locale",
  qrToken: "ac6cdf",
  qrSourceUrl: "https://www.cooperto.link/ac6cdf",
  eyebrow: "SOLO PER I VERI CORSARI",
  title: "SEI AL TORTUGA ADESSO?",
  description:
    "Scansiona il QR che trovi al tavolo, sapremo ringraziarti. Clicca su Scansiona QR e goditi il premio.",
  promo: {
    title: "Vantaggio sbloccato a bordo",
    benefit: "-15% su un dolce",
    instructions:
      "Mostra questo messaggio a un pirata prima di ordinare. Tieni la app aperta o fai uno screenshot.",
    microcopy: "Visita registrata. Il bottino \u00e8 valido solo oggi.",
    alreadyClaimed:
      "Sei gi\u00e0 stato segnato a bordo oggi.",
    coopertoError:
      "Non siamo riusciti a registrare la visita. Mostra comunque questa schermata a un pirata.",
  },
} as const;

export const ciurmaRoadmapFeatures = [] as const;

export const pwaConfig = {
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "",
  pushSubscriptionsFile: process.env.PUSH_SUBSCRIPTIONS_FILE?.trim() ?? "",
  installReminderWindowMs: 1000 * 60 * 60 * 24 * 7,
  pushReminderWindowMs: 1000 * 60 * 60 * 24 * 7,
};

export const tortugaRooms: Record<string, string> = {
  "da1d57f0-e0d5-4d7e-86be-9f8300f388b8": "Sala Centrale",
  "b7f34310-195e-4c03-ac05-a660e79dc1ce": "Soppalco",
  "32986b6b-4f7f-4924-a9de-c76445e1031e": "Galeone",
  "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c": "Area Family",
};

export const storageKeys = {
  customerIdentity: "tortuga.customer-identity",
  bookingDraft: "tortuga.booking-draft",
  profileLookup: "tortuga.profile-lookup",
  lastReservation: "tortuga.last-reservation",
  localExperienceClaims: "tortuga.local-experience-claims",
  menuAccessExpiresAt: "tortuga.menu-access-expires-at",
  installPromptDismissedAt: "tortuga.install-prompt-dismissed-at",
  pushPromptDismissedAt: "tortuga.push-prompt-dismissed-at",
  surveyPushSentAt: "tortuga.survey-push-sent-at",
  customerAvatarPrefix: "tortuga.customer-avatar",
  lastVisitAt: "tortuga.last-visit-at",
} as const;
