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
  { threshold: 15, label: "Zainetto Tortuga" },
  { threshold: 20, label: "T-shirt Tortuga" },
  { threshold: 30, label: "Boccale Tortuga" },
  { threshold: 40, label: "Felpa Tortuga" },
  { threshold: 60, label: "Telo Mare Tortuga" },
  { threshold: 100, label: "Cashback 50% VIP" },
  { threshold: 110, label: "Set Pirata Tortuga" },
  { threshold: 120, label: "Cena GRATIS con Jack Sparrow" },
];

export const fidelityVipThreshold = 150;

export const fidelityLoyaltyTiers: FidelityLoyaltyTier[] = [
  {
    minPoints: 0,
    label: "Clandestino",
    description: "Sei appena entrato nel giro. Il bottino parte da qui.",
    image: "/badges/loyalty-clandestino.png",
  },
  {
    minPoints: 20,
    label: "Mozzo",
    description: "Inizi a farti le ossa sul ponte. Continua a navigare.",
    image: "/badges/loyalty-mozzo.png",
  },
  {
    minPoints: 45,
    label: "Corsaro",
    description: "Al Tortuga ormai non passi inosservato. La tua fama cresce.",
    image: "/badges/loyalty-corsaro.png",
  },
  {
    minPoints: 75,
    label: "Bucaniere",
    description: "Sei un veterano dei saccheggi. La ciurma ti rispetta.",
    image: "/badges/loyalty-bucaniere.png",
  },
  {
    minPoints: 110,
    label: "Capitano",
    description: "Hai preso il comando. Ogni tuo approdo lascia il segno.",
    image: "/badges/loyalty-capitano.png",
  },
  {
    minPoints: fidelityVipThreshold,
    label: "Leggenda del Tortuga",
    description: "Il tuo nome e leggenda. I sette mari non hanno piu segreti.",
    image: "/badges/loyalty-leggenda.png",
  },
];
