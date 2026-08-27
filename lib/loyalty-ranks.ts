export type TortugaRankId = "mozzo" | "corsaro" | "capitano" | "leggenda";

export type TortugaRank = {
  id: TortugaRankId;
  label: string;
  visits: number;
  points: number;
  description: string;
};

export const tortugaRanks: TortugaRank[] = [
  { id: "mozzo", label: "Mozzo", visits: 1, points: 0, description: "Il primo approdo nella Ciurma." },
  { id: "corsaro", label: "Corsaro", visits: 5, points: 30, description: "La tua rotta comincia a farsi rispettare." },
  { id: "capitano", label: "Capitano", visits: 10, points: 60, description: "Hai conquistato il comando della Ciurma." },
  { id: "leggenda", label: "Leggenda del Tortuga", visits: 20, points: 100, description: "Il rango speciale riservato alle grandi rotte." },
];

export const getRankIndex = (id: TortugaRankId) => tortugaRanks.findIndex((rank) => rank.id === id);

export function getEarnedRank(visits: number, highestObservedPoints: number): TortugaRank {
  return [...tortugaRanks]
    .reverse()
    .find((rank) => visits >= rank.visits && highestObservedPoints >= rank.points) ?? tortugaRanks[0];
}

export function getActiveRank(
  visits: number,
  highestObservedPoints: number,
  historicalRank?: TortugaRankId,
  maintained = true,
) {
  const earned = getEarnedRank(visits, highestObservedPoints);
  const historical = historicalRank ? tortugaRanks[getRankIndex(historicalRank)] : earned;
  const highest = getRankIndex(historical.id) > getRankIndex(earned.id) ? historical : earned;
  // La mancata manutenzione azzera il vantaggio del rango storico, non un
  // rango che i valori del ciclo corrente permettono già di guadagnare.
  return maintained ? highest : earned;
}

export function getNextRank(rankId: TortugaRankId) {
  const index = getRankIndex(rankId);
  return tortugaRanks[Math.min(index + 1, tortugaRanks.length - 1)];
}
