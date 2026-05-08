import type { ProfileResponse } from "@/lib/cooperto/types";

export type Mission = {
  id: string;
  label: string;
  description: string;
  icon: string;
  image?: string;
  category: "navigazione" | "eventi" | "bottino" | "ciurma";
  isUnlocked: (profile: ProfileResponse) => boolean;
};

export const missions: Mission[] = [
  // Navigazione
  {
    id: "primo-approdo",
    label: "Primo Approdo",
    description: "Sbloccato alla prima visita registrata.",
    icon: "⚓",
    image: "/badges/primo-approdo.png",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("primo-approdo") || (p.contact?.NumeroVisite ?? 0) >= 1,
  },
  {
    id: "mozzo-di-bordo",
    label: "Mozzo di Bordo",
    description: "Sbloccato alla seconda visita.",
    icon: "🧹",
    image: "/badges/mozzo-di-bordo.png",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("mozzo-di-bordo") || (p.contact?.NumeroVisite ?? 0) >= 2,
  },
  {
    id: "membro-ciurma",
    label: "Membro della Ciurma",
    description: "Sbloccato dopo 3 visite.",
    icon: "☠️",
    image: "/badges/membro-ciurma.png",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("membro-ciurma") || (p.contact?.NumeroVisite ?? 0) >= 3,
  },
  {
    id: "pirati-fiducia",
    label: "Pirati di Fiducia",
    description: "Sbloccato dopo 5 visite.",
    icon: "⚔️",
    image: "/badges/pirati-fiducia.png",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("pirati-fiducia") || (p.contact?.NumeroVisite ?? 0) >= 5,
  },
  {
    id: "leggenda-tortuga",
    label: "Leggenda del Tortuga",
    description: "Sbloccato dopo 10 visite.",
    icon: "🏴‍☠️",
    image: "/badges/leggenda-tortuga.png",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("leggenda-tortuga") || (p.contact?.NumeroVisite ?? 0) >= 10,
  },
  {
    id: "fantasma-bancone",
    label: "Fantasma del Bancone",
    description: "Sbloccato dopo 15 visite.",
    icon: "👻",
    image: "/badges/fantasma-bancone.png",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("fantasma-bancone") || (p.contact?.NumeroVisite ?? 0) >= 15,
  },

  // Eventi
  {
    id: "kantaquiz",
    label: "Sopravvissuto al KantaQuiz",
    description: "Visita registrata di Venerdì.",
    icon: "🎤",
    image: "/badges/kantaquiz.png",
    category: "eventi",
    isUnlocked: (p) => {
      if (p.unlockedAchievementIds?.includes("kantaquiz")) return true;
      if (!p.contact?.DataUltimaVisita) return false;
      return new Date(p.contact.DataUltimaVisita).getDay() === 5;
    },
  },
  {
    id: "cervellone",
    label: "Cervello in Fuga",
    description: "Visita registrata di Domenica.",
    icon: "🧠",
    image: "/badges/cervellone.png",
    category: "eventi",
    isUnlocked: (p) => {
      if (p.unlockedAchievementIds?.includes("cervellone")) return true;
      if (!p.contact?.DataUltimaVisita) return false;
      return new Date(p.contact.DataUltimaVisita).getDay() === 0;
    },
  },
  {
    id: "sfida-capitano",
    label: "Sfida il Capitano",
    description: "Partecipa alla sfida digitale contro il Capitano in app.",
    icon: "⚓",
    image: "/badges/sfida-capitano.png",
    category: "eventi",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("sfida-capitano") ?? false,
  },
  {
    id: "assalto-buzzer",
    label: "Tortuga Music Quiz",
    description: "Partecipa a un round live del Tortuga Music Quiz.",
    icon: "🎵",
    image: "/badges/assalto-buzzer.png",
    category: "eventi",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("assalto-buzzer") ?? false,
  },
  {
    id: "mano-cannone",
    label: "Mano sul Cannone",
    description: "Premi il buzzer tra i primi 3 pirati.",
    icon: "💣",
    image: "/badges/mano-cannone.png",
    category: "eventi",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("mano-cannone") ?? false,
  },
  {
    id: "match-drink-complete",
    label: "Scegli o Affonda",
    description: "Rispondi a tutte le domande di Match & Drink.",
    icon: "🍸",
    image: "/badges/match-drink-complete.png",
    category: "eventi",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("match-drink-complete") ?? false,
  },
  {
    id: "message-bottle",
    label: "Message in a Bottle",
    description: "Invia un messaggio anonimo durante Match & Drink.",
    icon: "🍾",
    image: "/badges/message-bottle.png",
    category: "eventi",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("message-bottle") ?? false,
  },
  {
    id: "mai-normale",
    label: "Mai una serata normale",
    description: "Partecipa a 3 eventi diversi (Buzzer, Match&Drink, KantaQuiz, ecc).",
    icon: "🎭",
    image: "/badges/mai-normale.png",
    category: "eventi",
    isUnlocked: (p) => {
      if (p.unlockedAchievementIds?.includes("mai-normale")) return true;
      const eventIds = ["kantaquiz", "cervellone", "sfida-capitano", "assalto-buzzer", "match-drink-complete"];
      const unlockedCount = eventIds.filter(id => p.unlockedAchievementIds?.includes(id)).length;
      return unlockedCount >= 3;
    },
  },

  // Bottino
  {
    id: "cacciatore-bottino",
    label: "Cacciatore di Bottino",
    description: "Usa il tuo primo coupon.",
    icon: "💰",
    category: "bottino",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("cacciatore-bottino") || p.coupons.some((c) => c.Utilizzato),
  },
  {
    id: "chiave-oro",
    label: "Chiave d'Oro",
    description: "Usa almeno 3 coupon.",
    icon: "🔑",
    category: "bottino",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("chiave-oro") || p.coupons.filter((c) => c.Utilizzato).length >= 3,
  },
  {
    id: "assaggiatore-ufficiale",
    label: "Assaggiatore Ufficiale",
    description: "Carica la tua prima ricevuta.",
    icon: "🧾",
    category: "bottino",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("assaggiatore-ufficiale") ?? false,
  },

  // Ciurma
  {
    id: "capitano-tavolata",
    label: "Capitano della Tavolata",
    description: "Prenota da almeno 6 persone.",
    icon: "👥",
    category: "ciurma",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("capitano-tavolata") || p.upcomingReservations.some((r) => (r.pax ?? 0) >= 6),
  },
  {
    id: "grande-ammutinamento",
    label: "Grande Ammutinamento",
    description: "Prenota da almeno 10 persone.",
    icon: "📢",
    category: "ciurma",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("grande-ammutinamento") || p.upcomingReservations.some((r) => (r.pax ?? 0) >= 10),
  },
  {
    id: "fotografo-ciurma",
    label: "Fotografo della Ciurma",
    description: "Carica una foto nello Scatto del Mese.",
    icon: "📷",
    category: "ciurma",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("fotografo-ciurma") ?? false,
  },
  {
    id: "scatto-ricercato",
    label: "Scatto da Ricercato",
    description: "Carica la tua foto avatar nel profilo.",
    icon: "🖼️",
    category: "ciurma",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("scatto-ricercato") || Boolean(p.avatarUrl),
  },
  {
    id: "rotta-infrasettimanale",
    label: "Rotta Infrasettimanale",
    description: "Prenota per un mercoledì o un giovedì.",
    icon: "⚓",
    category: "ciurma",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("rotta-infrasettimanale") || p.upcomingReservations.some(r => [3, 4].includes(new Date(r.dateTime).getDay())),
  },
  {
    id: "ritorno-naufragio",
    label: "Ritorno dal Naufragio",
    description: "Torna a trovarci dopo più di 60 giorni di assenza.",
    icon: "🏝️",
    image: "/badges/ritorno-naufragio.png",
    category: "navigazione",
    isUnlocked: (p) => {
      if (p.unlockedAchievementIds?.includes("ritorno-naufragio")) return true;
      if (!p.contact?.DataUltimaVisita) return false;
      const lastVisit = new Date(p.contact.DataUltimaVisita);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastVisit.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 60;
    },
  },
  {
    id: "stessa-rotta-3",
    label: "Tre volte sulla stessa rotta",
    description: "Torna a trovarci 3 volte nello stesso mese.",
    icon: "🗺️",
    image: "/badges/stessa-rotta-3.png",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("stessa-rotta-3") ?? false,
  },
  {
    id: "naufragio-perfetto",
    label: "Il Naufragio Perfetto",
    description: "Prenota, usa coupon, gioca e carica foto nella stessa settimana.",
    icon: "🌪️",
    image: "/badges/naufragio-perfetto.png",
    category: "ciurma",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("naufragio-perfetto") ?? false,
  },
];
