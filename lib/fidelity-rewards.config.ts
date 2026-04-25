export type FidelityRewardTier = {
  threshold: number;
  label: string;
};

export type FidelityLoyaltyTier = {
  minPoints: number;
  label: string;
  description: string;
};

export const fidelityRewardTiers: FidelityRewardTier[] = [
  { threshold: 15, label: "Zainetto Tortuga" },
  { threshold: 20, label: "T-shirt Tortuga" },
  { threshold: 30, label: "Boccale Tortuga" },
  { threshold: 40, label: "Felpa Tortuga" },
  { threshold: 60, label: "Telo Mare Tortuga" },
  { threshold: 100, label: "Cashback 50% VIP" },
  { threshold: 110, label: "Set Pirata Tortuga" },
  { threshold: 120, label: "Cena GRATIS con Jack Sparrow" },
];

export const fidelityVipThreshold = 100;

export const fidelityLoyaltyTiers: FidelityLoyaltyTier[] = [
  {
    minPoints: 0,
    label: "Clandestino",
    description: "Sei appena entrato nel giro. Il bottino parte da qui.",
  },
  {
    minPoints: 35,
    label: "Corsaro",
    description: "Al Tortuga ormai non passi inosservato.",
  },
  {
    minPoints: 70,
    label: "Capitano della Isla Loca",
    description: "Hai preso il ponte. Ogni approdo lascia il segno.",
  },
  {
    minPoints: fidelityVipThreshold,
    label: "Leggenda dei Mari",
    description: "Il tuo nome gira gia sottobanco. Il resto e solo bottino.",
  },
];
