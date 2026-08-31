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
  { threshold: 100, label: "25% Cashback ad ogni visita" },
];

export const fidelityVipThreshold = 150;

export const fidelityLoyaltyTiers: FidelityLoyaltyTier[] = [
  {
    minPoints: 0,
    label: "Mozzo",
    description: "Il primo approdo nella Ciurma.",
    image: "/badges/loyalty-mozzo.webp",
  },
  {
    minPoints: 30,
    label: "Corsaro",
    description: "5 visite e 30 Dobloni raggiunti.",
    image: "/badges/loyalty-corsaro.webp",
  },
  {
    minPoints: 60,
    label: "Capitano",
    description: "10 visite e 60 Dobloni raggiunti.",
    image: "/badges/loyalty-capitano.webp",
  },
  {
    minPoints: 100,
    label: "Leggenda del Tortuga",
    description: "20 visite e 100 Dobloni raggiunti.",
    image: "/badges/loyalty-leggenda.webp",
  },
];
