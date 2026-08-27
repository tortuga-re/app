export type FidelityRewardTier = {
  threshold: number;
  label: string;
};

export type FidelityLoyaltyTier = {
  minPoints: number;
  label: string;
  description: string;
  image?: string;
};

export const fidelityRewardTiers: FidelityRewardTier[] = [
  { threshold: 15, label: "Gnocco o Tigelle" },
  { threshold: 20, label: "Appetizer a scelta" },
  { threshold: 30, label: "Tagliere di salumi" },
  { threshold: 40, label: "Tagliere della ciurma x2" },
  { threshold: 60, label: "Perla Nera + Bibita Media" },
  { threshold: 100, label: "GOLD Fidelity Club" },
];

export const fidelityVipThreshold = 150;

export const fidelityLoyaltyTiers: FidelityLoyaltyTier[] = [
  {
    minPoints: 0,
    label: "Mozzo",
    description: "Il primo approdo nella Ciurma.",
    image: "/badges/loyalty-mozzo.png",
  },
  {
    minPoints: 30,
    label: "Corsaro",
    description: "5 visite e 30 Dobloni raggiunti.",
    image: "/badges/loyalty-corsaro.png",
  },
  {
    minPoints: 60,
    label: "Capitano",
    description: "10 visite e 60 Dobloni raggiunti.",
    image: "/badges/loyalty-capitano.png",
  },
  {
    minPoints: 100,
    label: "Leggenda del Tortuga",
    description: "20 visite e 100 Dobloni raggiunti.",
    image: "/badges/loyalty-leggenda.png",
  },
];
