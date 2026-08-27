export type TortugaRankId = "mozzo" | "corsaro" | "capitano" | "leggenda";

export type TortugaRank = {
  id: TortugaRankId;
  label: string;
  visits: number;
  points: number;
  description: string;
  privileges: string[];
};

export const tortugaRanks: TortugaRank[] = [
  { 
    id: "mozzo", 
    label: "Mozzo", 
    visits: 1, 
    points: 0, 
    description: "Il primo approdo nella Ciurma.",
    privileges: [
      "+5 Dobloni bonus di arruolamento",
      "Entra nella classifica della Ciurma",
      "Inizia a conquistare le Imprese",
      "Progressione e statistiche personali",
      "Matricola pirata e data arruolamento"
    ]
  },
  { 
    id: "corsaro", 
    label: "Corsaro", 
    visits: 5, 
    points: 30, 
    description: "La tua rotta comincia a farsi rispettare.",
    privileges: [
      "+5 Dobloni bonus di passaggio",
      "Tutti i privilegi del Mozzo",
      "Rotta Prioritaria (prenotazioni anticipate serate/eventi)",
      "La Voce della Ciurma (sondaggi e votazioni riservate)",
      "Accesso a imprese ed esperienze Corsaro+"
    ]
  },
  { 
    id: "capitano", 
    label: "Capitano", 
    visits: 10, 
    points: 60, 
    description: "Hai conquistato il comando della Ciurma.",
    privileges: [
      "+5 Dobloni bonus di passaggio",
      "Tutti i privilegi del Corsaro",
      "Priorità d'imbarco (liste d'attesa prioritarie)",
      "Il Tavolo del Capitano (zona di preferenza tavolo)",
      "Parola al Capitano (proponi sfide, canzoni e domande)",
      "Accesso a sfide e tornei Capitano+"
    ]
  },
  { 
    id: "leggenda", 
    label: "Leggenda del Tortuga", 
    visits: 20, 
    points: 100, 
    description: "Il rango speciale riservato alle grandi rotte.",
    privileges: [
      "+5 Dobloni bonus di passaggio",
      "Tutti i privilegi del Capitano",
      "Numero storico di Leggenda (es. #0047)",
      "Inserimento nella Hall of Legends",
      "Consiglio delle Leggende (scelta serate speciali)",
      "Accesso alle anteprime assolute",
      "Partecipazione al Raduno delle Leggende"
    ]
  },
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
