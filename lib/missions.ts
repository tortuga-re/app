import type { ProfileResponse } from "@/lib/cooperto/types";
import { getRomeWeekday } from "@/lib/utils";

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
  {
    id: "baule-benvenuto",
    label: "Baule di Benvenuto",
    description: "Completa l'imbarco e apri il tuo Baule.",
    icon: "🧰",
    image: "/badges/baule-benvenuto.png",
    category: "bottino",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("baule-benvenuto") ?? false,
  },
  {
    id: "slot-pirata",
    label: "Slot Pirata",
    description: "Tenta la fortuna nella Slot del Capitano.",
    icon: "🎰",
    image: "/badges/slot-pirata.png",
    category: "bottino",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("slot-pirata") ?? false,
  },
  // Navigazione
  {
    id: "primo-approdo",
    label: "Primo Approdo",
    description: "Sbloccato alla prima visita registrata.",
    icon: "⚓",
    image: "/badges/primo-approdo.webp",
    category: "navigazione",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("primo-approdo") ||
      (p.contact?.NumeroVisite ?? 0) >= 1,
  },
  {
    id: "mozzo-di-bordo",
    label: "Mozzo di Bordo",
    description: "Sbloccato con 1 visita e Fidelity attiva.",
    icon: "🧹",
    image: "/badges/mozzo-di-bordo.webp",
    category: "navigazione",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("mozzo-di-bordo") ||
      ((p.contact?.NumeroVisite ?? 0) >= 1 && Boolean(
        p.contact?.CodiceCard || p.contact?.CodiceCardAssegnata || p.fidelityCards.length,
      )),
  },
  {
    id: "membro-ciurma",
    label: "Membro della Ciurma",
    description: "Sbloccato dopo 3 visite.",
    icon: "☠️",
    image: "/badges/membro-ciurma.webp",
    category: "navigazione",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("membro-ciurma") ||
      (p.contact?.NumeroVisite ?? 0) >= 3,
  },
  {
    id: "pirati-fiducia",
    label: "Corsaro di Fiducia",
    description: "Sbloccato dopo 5 visite.",
    icon: "⚔️",
    image: "/badges/pirati-fiducia.webp",
    category: "navigazione",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("pirati-fiducia") ||
      (p.contact?.NumeroVisite ?? 0) >= 5,
  },
  {
    id: "leggenda-tortuga",
    label: "Leggenda del Tortuga",
    description: "Sbloccato dopo 20 visite.",
    icon: "🏴‍☠️",
    image: "/badges/leggenda-tortuga.webp",
    category: "navigazione",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("leggenda-tortuga") ||
      (p.contact?.NumeroVisite ?? 0) >= 20,
  },
  {
    id: "capitano",
    label: "Capitano",
    description: "Sbloccato dopo 10 visite.",
    icon: "👻",
    image: "/badges/loyalty-capitano.webp",
    category: "navigazione",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("capitano") ||
      (p.contact?.NumeroVisite ?? 0) >= 10,
  },

  // Eventi
  {
    id: "kantaquiz",
    label: "Sopravvissuto al KantaQuiz",
    description: "Visita registrata di Venerdì.",
    icon: "🎤",
    image: "/badges/kantaquiz.webp",
    category: "eventi",
    isUnlocked: (p) => {
      if (p.unlockedAchievementIds?.includes("kantaquiz")) return true;
      if (!p.contact?.DataUltimaVisita) return false;
      return getRomeWeekday(p.contact.DataUltimaVisita) === 5;
    },
  },
  {
    id: "cervellone",
    label: "Cervello in Fuga",
    description: "Visita registrata di Domenica.",
    icon: "🧠",
    image: "/badges/cervellone.webp",
    category: "eventi",
    isUnlocked: (p) => {
      if (p.unlockedAchievementIds?.includes("cervellone")) return true;
      if (!p.contact?.DataUltimaVisita) return false;
      return getRomeWeekday(p.contact.DataUltimaVisita) === 0;
    },
  },
  {
    id: "mai-normale",
    label: "Mai una serata normale",
    description: "Partecipa a 2 serate diverse.",
    icon: "🎭",
    image: "/badges/mai-normale.webp",
    category: "eventi",
    isUnlocked: (p) => {
      if (p.unlockedAchievementIds?.includes("mai-normale")) return true;
      const eventIds = [
        "kantaquiz",
        "cervellone",
      ];
      const unlockedCount = eventIds.filter((id) =>
        p.unlockedAchievementIds?.includes(id),
      ).length;
      return unlockedCount >= 2;
    },
  },

  // Bottino
  {
    id: "cacciatore-bottino",
    label: "Cacciatore di Bottino",
    description: "Usa il tuo primo coupon.",
    icon: "💰",
    image: "/badges/cacciatore-bottino.webp",
    category: "bottino",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("cacciatore-bottino") ||
      p.coupons.some((c) => c.Utilizzato),
  },
  {
    id: "chiave-oro",
    label: "Chiave d'Oro",
    description: "Usa almeno 3 coupon.",
    icon: "🔑",
    image: "/badges/chiave-oro.webp",
    category: "bottino",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("chiave-oro") ||
      p.coupons.filter((c) => c.Utilizzato).length >= 3,
  },
  {
    id: "assaggiatore-ufficiale",
    label: "Assaggiatore Ufficiale",
    description: "Carica la tua prima ricevuta.",
    icon: "🧾",
    image: "/badges/assaggiatore-ufficiale.webp",
    category: "bottino",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("assaggiatore-ufficiale") ?? false,
  },

  // Ciurma
  {
    id: "capitano-tavolata",
    label: "Capitano della Tavolata",
    description: "Prenotazione da almeno 6 persone.",
    icon: "👥",
    image: "/badges/capitano-tavolata.webp",
    category: "ciurma",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("capitano-tavolata") ||
      p.upcomingReservations.some((r) => (r.pax ?? 0) >= 6),
  },
  {
    id: "grande-ammutinamento",
    label: "Grande Ammutinamento",
    description: "Prenotazione da almeno 10 persone.",
    icon: "📢",
    image: "/badges/grande-ammutinamento.webp",
    category: "ciurma",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("grande-ammutinamento") ||
      p.upcomingReservations.some((r) => (r.pax ?? 0) >= 10),
  },
  {
    id: "fotografo-ciurma",
    label: "Fotografo della Ciurma",
    description: "Invia una foto durante una serata Foto Live.",
    icon: "📷",
    image: "/badges/fotografo-ciurma.webp",
    category: "ciurma",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("fotografo-ciurma") ?? false,
  },
  {
    id: "rotta-infrasettimanale",
    label: "Rotta Infrasettimanale",
    description: "Prenota per un mercoledì o un giovedì.",
    icon: "⚓",
    image: "/badges/rotta-infrasettimanale.webp",
    category: "ciurma",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("rotta-infrasettimanale") ||
      p.upcomingReservations.some((r) =>
        [3, 4].includes(getRomeWeekday(r.dateTime)),
      ),
  },
  {
    id: "ritorno-naufragio",
    label: "Ritorno dal Naufragio",
    description: "Torna a trovarci dopo più di 60 giorni di assenza.",
    icon: "🏝️",
    image: "/badges/ritorno-naufragio.webp",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("ritorno-naufragio") ?? false,
  },
  {
    id: "stessa-rotta-3",
    label: "Tre volte sulla stessa rotta",
    description: "Torna a trovarci 3 volte nello stesso mese.",
    icon: "🗺️",
    image: "/badges/stessa-rotta-3.webp",
    category: "navigazione",
    isUnlocked: (p) => p.unlockedAchievementIds?.includes("stessa-rotta-3") ?? false,
  },
  {
    id: "naufragio-perfetto",
    label: "Il Naufragio Perfetto",
    description: "Completa tutte le altre imprese del Tortuga.",
    icon: "🌪️",
    image: "/badges/naufragio-perfetto.webp",
    category: "ciurma",
    isUnlocked: (p) =>
      p.unlockedAchievementIds?.includes("naufragio-perfetto") ||
      missions
        .filter((mission) => mission.id !== "naufragio-perfetto" && mission.id !== "ritorno-naufragio")
        .every((mission) => mission.isUnlocked(p)),
  },
];
