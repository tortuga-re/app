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
export const TORTUGA_LIVE_LOGO_URL = "/images/LOGO-TORTUGA-2.png";
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

export const LIVE_APP_FEATURE_CARDS: Array<{
  id: string;
  name: string;
  description: string;
  item: LiveTvUpsertItemInput;
}> = [
  {
    id: "foto_live",
    name: "📸 Foto Live sul Maxischermo",
    description: "Invita i tavoli a scattare e caricare foto per vederle in diretta in TV.",
    item: {
      type: "qr",
      title: "📸 Mostra la tua Foto in TV!",
      body: "Inquadra il QR con lo smartphone, carica le foto del tuo tavolo e guardale comparire sul maxischermo del Tortuga!",
      qrUrl: `${APP_URL}/stasera?tab=bottiglia`,
      qrLabel: "Carica Foto in TV",
      durationSeconds: 25,
      enabled: true,
      styleVariant: "gold",
    },
  },
  {
    id: "saluti_live",
    name: "🥂 Saluti e Brindisi in TV",
    description: "Invita la sala a mandare messaggi, auguri e brindisi sul maxischermo.",
    item: {
      type: "qr",
      title: "🥂 Manda un Saluto sul Palco!",
      body: "Vuoi fare un brindisi speciale, fare gli auguri o mandare un saluto a tutta la sala? Invia il tuo messaggio in diretta dall'app!",
      qrUrl: `${APP_URL}/stasera?tab=saluti`,
      qrLabel: "Invia Saluto Live",
      durationSeconds: 20,
      enabled: true,
      styleVariant: "urgent",
    },
  },
  {
    id: "sfida_bottiglia",
    name: "🍾 Sfida della Bottiglia",
    description: "Votazione foto più bella della serata: la vincitrice riceve 1 bottiglia.",
    item: {
      type: "qr",
      title: "🍾 Sfida della Bottiglia: Vota!",
      body: "La foto più votata della serata vince 1 bottiglia omaggio offerta dal Tortuga! Guarda la gallery e vota la tua preferita!",
      qrUrl: `${APP_URL}/stasera?tab=bottiglia`,
      qrLabel: "Vota e Vinci la Bottiglia",
      durationSeconds: 25,
      enabled: true,
      styleVariant: "gold",
    },
  },
  {
    id: "kantaquiz_canzoni",
    name: "🎤 Vota Canzone / Kanta Quiz",
    description: "Invita i tavoli a scegliere i brani da cantare e partecipare al quiz.",
    item: {
      type: "qr",
      title: "🎤 Scegli la Canzone Live!",
      body: "Decidi cosa si canta stasera al Tortuga! Inquadra il QR, vota il tuo brano preferito e preparati a cantare con tutta la ciurma!",
      qrUrl: `${APP_URL}/stasera?tab=canzoni`,
      qrLabel: "Vota la Canzone",
      durationSeconds: 20,
      enabled: true,
      styleVariant: "promo",
    },
  },
];

const genericItems = (): LiveTvUpsertItemInput[] => [
  {
    type: "logo",
    title: "Tortuga Live",
    body: "La serata e in onda. Resta a bordo e preparati alla prossima rotta.",
    mediaUrl: TORTUGA_LIVE_LOGO_URL,
    durationSeconds: 12,
    enabled: true,
    styleVariant: "gold",
  },
  LIVE_APP_FEATURE_CARDS[0].item, // Foto Live sul Maxischermo
  {
    type: "qr",
    title: "Scansiona e sali a bordo",
    body: "Prenotazioni, ciurma, premi e giochi live in un solo QR.",
    qrUrl: APP_URL,
    qrLabel: "Apri Tortuga App",
    durationSeconds: 18,
    enabled: true,
    styleVariant: "default",
  },
  LIVE_APP_FEATURE_CARDS[2].item, // Sfida della Bottiglia
  {
    type: "event",
    title: "Prossima rotta",
    body: "Mercoledi Burger Night, Venerdi Kantaquiz, Sabato Notte del Capitano e Domenica Cervellone.",
    qrUrl: PROGRAM_URL,
    qrLabel: "Programmazione Tortuga",
    durationSeconds: 14,
    enabled: true,
    styleVariant: "promo",
  },
  LIVE_APP_FEATURE_CARDS[1].item, // Saluti e Brindisi
  {
    type: "review",
    title: "La ciurma dice di noi",
    body: REVIEW.text,
    durationSeconds: 12,
    enabled: true,
    styleVariant: "review",
  },
  {
    type: "promo",
    title: "Fidelity di bordo",
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
      body: "Spezzare la settimana e piu facile quando la serata parte dal burger giusto.",
      qrUrl: MENU_URL,
      qrLabel: "Apri il menu",
      durationSeconds: 14,
      enabled: true,
      styleVariant: "promo",
    },
    ...genericItems().slice(2),
  ],
  venerdi_kantaquiz: () => [
    genericItems()[0],
    LIVE_APP_FEATURE_CARDS[3].item, // Vota Canzone / Kanta Quiz
    LIVE_APP_FEATURE_CARDS[0].item, // Foto Live
    LIVE_APP_FEATURE_CARDS[1].item, // Saluti Live
    genericItems()[2],
    genericItems()[4],
  ],
  sabato_notte_capitano: () => [
    genericItems()[0],
    LIVE_APP_FEATURE_CARDS[1].item, // Saluti Live
    LIVE_APP_FEATURE_CARDS[0].item, // Foto Live
    LIVE_APP_FEATURE_CARDS[2].item, // Sfida della Bottiglia
    genericItems()[2],
    genericItems()[4],
  ],
  domenica_cervellone: () => [
    genericItems()[0],
    LIVE_APP_FEATURE_CARDS[0].item, // Foto Live
    LIVE_APP_FEATURE_CARDS[2].item, // Sfida della Bottiglia
    LIVE_APP_FEATURE_CARDS[1].item, // Saluti Live
    genericItems()[2],
    genericItems()[4],
  ],
};

export const buildPresetPlaylist = (presetId: LiveTvPresetId) => {
  const items = presetVariants[presetId]?.() ?? presetVariants.generica();
  return items.map((item, index) => createItem(index, item));
};

export const getPresetMeta = (presetId: LiveTvPresetId) =>
  LIVE_TV_PRESETS.find((preset) => preset.id === presetId) ?? LIVE_TV_PRESETS[0];
