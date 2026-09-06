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
    name: "🍾 Vinci la Bottiglia • Foto Live",
    description: "Invita a caricare e votare le foto per vincere la bottiglia di vino in palio.",
    item: {
      type: "image",
      title: "VINCI LA BOTTIGLIA DI VINO • FOTO LIVE",
      body: "Inquadra il QR al tuo tavolo ➔ Apri la sezione Live (o tortugabay.it/live) ➔ Carica la foto e vota la più bella per vincere la bottiglia in palio!",
      mediaUrl: "/images/live-tv/foto-live-bottiglia.jpg",
      durationSeconds: 20,
      enabled: true,
      styleVariant: "gold",
    },
  },
  {
    id: "saluti_live",
    name: "🥂 Brinda & Saluti sul Maxischermo",
    description: "Invita la sala a mandare messaggi, auguri e brindisi sul maxischermo.",
    item: {
      type: "image",
      title: "BRINDA E MANDA I SALUTI IN DIRETTA",
      body: "Inquadra il QR al tuo tavolo ➔ Apri la sezione Live ➔ Invia dediche, auguri e brindisi sul maxischermo per far festa con tutto il locale!",
      mediaUrl: "/images/live-tv/saluti-brindisi-live.jpg",
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
      type: "image",
      title: "SFIDA DELLA BOTTIGLIA • VOTAZIONE LIVE",
      body: "Inquadra il QR al tuo tavolo ➔ Apri la sezione Live ➔ Vota la foto più bella della serata: chi vince si porta a casa la bottiglia!",
      mediaUrl: "/images/live-tv/foto-live-bottiglia.jpg",
      durationSeconds: 20,
      enabled: true,
      styleVariant: "gold",
    },
  },
  {
    id: "kantaquiz_canzoni",
    name: "🎤 Vota Canzone / Kanta Quiz",
    description: "Invita i tavoli a scegliere i brani da cantare e partecipare al quiz.",
    item: {
      type: "image",
      title: "SCEGLI E VOTA LE CANZONI DAL VIVO",
      body: "Inquadra il QR al tuo tavolo ➔ Apri la sezione Live ➔ Vota le tue canzoni preferite: le canzoni più votate verranno utilizzate per l'ultima manche!",
      mediaUrl: "/images/live-tv/vota-canzone-live.jpg",
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
  LIVE_APP_FEATURE_CARDS[0].item, // 📸 Vinci la Bottiglia • Foto Live (20s)
  {
    type: "qr",
    title: "Scansiona e sali a bordo",
    body: "Prenotazioni, ciurma, premi e giochi live in un solo QR.",
    qrUrl: APP_URL,
    qrLabel: "Apri Tortuga App",
    durationSeconds: 16,
    enabled: true,
    styleVariant: "default",
  },
  LIVE_APP_FEATURE_CARDS[1].item, // 🥂 Saluti e Brindisi sul Maxischermo (20s)
  LIVE_APP_FEATURE_CARDS[3].item, // 🎤 Scegli e Vota la Canzone dal Vivo (20s)
  {
    type: "review",
    title: "La ciurma dice di noi",
    body: REVIEW.text,
    durationSeconds: 14,
    enabled: true,
    styleVariant: "review",
  },
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
