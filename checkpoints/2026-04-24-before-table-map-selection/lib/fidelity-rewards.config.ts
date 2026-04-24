export type FidelityRewardTier = {
  threshold: number;
  label: string;
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
