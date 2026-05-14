import { siteConfig, tortugaInfoConfig } from "@/lib/config";

import type {
  LiveTvItem,
  LiveTvPresetDefinition,
  LiveTvPresetId,
  LiveTvUpsertItemInput,
} from "./types";

export const LIVE_TV_PRESETS: LiveTvPresetDefinition[] = [
  {
    id: "generica",
    label: "Generica",
    description: "Rotazione classica Tortuga con promo, QR, recensioni ed eventi.",
  },
  {
    id: "mercoledi_burger",
    label: "Mercoledi Burger",
    description: "Focus su burger night, promo midweek e chiamata alla prenotazione.",
  },
  {
    id: "giovedi_match_drink",
    label: "Giovedi Match & Drink",
    description: "Promo pre-game e call to action per partecipare al Match & Drink.",
  },
  {
    id: "venerdi_kantaquiz",
    label: "Venerdi Kantaquiz",
    description: "Serata quiz, palco acceso e invito alla ciurma del venerdi.",
  },
  {
    id: "sabato_notte_capitano",
    label: "Sabato Notte Capitano",
    description: "Atmosfera notturna, promo ciurma e messaggi del Capitano.",
  },
  {
    id: "domenica_cervellone",
    label: "Domenica Cervellone",
    description: "Quiz domenicale, famiglie e gruppi, con invito a prenotare.",
  },
] as const;

const APP_URL = siteConfig.productionUrl;
const MENU_URL = tortugaInfoConfig.menuUrl;
const PROGRAM_URL = tortugaInfoConfig.programmazioneUrl;
const REVIEW = tortugaInfoConfig.reviews[0];
export const TORTUGA_LIVE_LOGO_URL =
  "https://tortugabay.it/wp-content/uploads/2026/05/LOGO-TORTUGA-2.png";
const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `live-tv-${Math.random().toString(36).slice(2, 10)}`;

const createItem = (
  order: number,
  input: LiveTvUpsertItemInput,
  id = createId(),
  timestamp = new Date().toISOString(),
): LiveTvItem => ({
  id,
  type: input.type,
  title: input.title,
  subtitle: input.subtitle,
  body: input.body,
  mediaUrl: input.mediaUrl,
  qrUrl: input.qrUrl,
  qrLabel: input.qrLabel,
  durationSeconds: input.durationSeconds,
  enabled: input.enabled,
  order,
  styleVariant: input.styleVariant ?? "default",
  createdAt: timestamp,
  updatedAt: timestamp,
});

const genericItems = (): LiveTvUpsertItemInput[] => [
  {
    type: "logo",
    title: "Tortuga Live",
    subtitle: "EAT.DRINK.TORTUGA.REPEAT",
    body: "La serata e in onda. Resta a bordo e preparati alla prossima rotta.",
    mediaUrl: TORTUGA_LIVE_LOGO_URL,
    durationSeconds: 12,
    enabled: true,
    styleVariant: "gold",
  },
  {
    type: "qr",
    title: "Scansiona e sali a bordo",
    subtitle: "Apri la Tortuga App",
    body: "Prenotazioni, ciurma, premi e giochi live in un solo QR.",
    qrUrl: APP_URL,
    qrLabel: "Apri Tortuga App",
    durationSeconds: 18,
    enabled: true,
    styleVariant: "default",
  },
  {
    type: "event",
    title: "Prossima rotta",
    subtitle: "Programmazione settimanale",
    body: "Mercoledi Burger Night, Giovedi Match & Drink, Venerdi Kantaquiz, Sabato Notte del Capitano.",
    qrUrl: PROGRAM_URL,
    qrLabel: "Programmazione Tortuga",
    durationSeconds: 14,
    enabled: true,
    styleVariant: "promo",
  },
  {
    type: "review",
    title: "La ciurma dice di noi",
    subtitle: `${REVIEW.author} • ${REVIEW.source}`,
    body: REVIEW.text,
    durationSeconds: 12,
    enabled: true,
    styleVariant: "review",
  },
  {
    type: "promo",
    title: "Fidelity di bordo",
    subtitle: "Punti, premi e colpi di fortuna",
    body: "Apri l'app, entra nella Ciurma e tieni pronti i tuoi vantaggi per la serata.",
    qrUrl: APP_URL,
    qrLabel: "Apri la Ciurma",
    durationSeconds: 12,
    enabled: true,
    styleVariant: "gold",
  },
  {
    type: "message",
    title: "Messaggio dal Capitano",
    subtitle: "La serata e in onda",
    body: "Niente scroll, niente distrazioni: goditi il locale e tieni d'occhio lo schermo.",
    durationSeconds: 10,
    enabled: true,
    styleVariant: "dark",
  },
];

const presetVariants: Record<LiveTvPresetId, () => LiveTvUpsertItemInput[]> = {
  generica: genericItems,
  mercoledi_burger: () => [
    ...genericItems().slice(0, 2),
    {
      type: "promo",
      title: "Mercoledi Burger Night",
      subtitle: "Piatto + bevanda media",
      body: "Spezzare la settimana e piu facile quando la serata parte dal burger giusto.",
      qrUrl: MENU_URL,
      qrLabel: "Apri il menu",
      durationSeconds: 14,
      enabled: true,
      styleVariant: "promo",
    },
    ...genericItems().slice(2),
  ],
  giovedi_match_drink: () => [
    genericItems()[0],
    genericItems()[1],
    {
      type: "promo",
      title: "Giovedi Match & Drink",
      subtitle: "Ultima chiamata per salire a bordo",
      body: "Apri l'app, entra in Ciurma e preparati al gioco. Il match vero parte solo sullo stage dedicato.",
      qrUrl: `${APP_URL}/game/match-drink`,
      qrLabel: "Partecipa al Match & Drink",
      durationSeconds: 16,
      enabled: true,
      styleVariant: "gold",
    },
    genericItems()[3],
    genericItems()[5],
    genericItems()[2],
  ],
  venerdi_kantaquiz: () => [
    genericItems()[0],
    {
      type: "promo",
      title: "Venerdi Kantaquiz",
      subtitle: "Quiz, musica e tavoli pronti",
      body: "Scansiona, preparati e resta sintonizzato: il palco si accende quando il Capitano da il via.",
      qrUrl: `${APP_URL}/game/buzzer`,
      qrLabel: "Apri il Music Quiz",
      durationSeconds: 16,
      enabled: true,
      styleVariant: "promo",
    },
    genericItems()[1],
    genericItems()[3],
    genericItems()[5],
    genericItems()[2],
  ],
  sabato_notte_capitano: () => [
    genericItems()[0],
    {
      type: "message",
      title: "Notte del Capitano",
      subtitle: "Atmosfera piena, timone saldo",
      body: "Musica, luci basse e tavoli caldi: se devi fare una mossa, questo e il momento.",
      durationSeconds: 12,
      enabled: true,
      styleVariant: "gold",
    },
    genericItems()[1],
    genericItems()[4],
    genericItems()[3],
    genericItems()[2],
  ],
  domenica_cervellone: () => [
    genericItems()[0],
    {
      type: "event",
      title: "Domenica Cervellone",
      subtitle: "Famiglie, amici e tavoli pronti",
      body: "Una rotta piu rilassata, ma nessuno regala punti. Prenota il tavolo e porta la tua squadra.",
      qrUrl: `${APP_URL}/prenota`,
      qrLabel: "Prenota un tavolo",
      durationSeconds: 14,
      enabled: true,
      styleVariant: "default",
    },
    genericItems()[1],
    genericItems()[3],
    genericItems()[5],
    genericItems()[4],
  ],
};

export const buildPresetPlaylist = (presetId: LiveTvPresetId) => {
  const items = presetVariants[presetId]?.() ?? presetVariants.generica();
  return items.map((item, index) => createItem(index, item));
};

export const getPresetMeta = (presetId: LiveTvPresetId) =>
  LIVE_TV_PRESETS.find((preset) => preset.id === presetId) ?? LIVE_TV_PRESETS[0];
