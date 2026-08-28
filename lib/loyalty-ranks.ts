export type TortugaRankId = "mozzo" | "corsaro" | "capitano" | "leggenda";

export type TortugaRankPrivilege = {
  text: string;
  icon: string;
};

export type TortugaRank = {
  id: TortugaRankId;
  label: string;
  visits: number;
  points: number;
  description: string;
  privileges: TortugaRankPrivilege[];
};

export const tortugaRanks: TortugaRank[] = [
  { 
    id: "mozzo", 
    label: "Mozzo", 
    visits: 1, 
    points: 0, 
    description: "Il primo approdo nella Ciurma.",
    privileges: [
      { text: "+5 Dobloni bonus di arruolamento", icon: "🪙" },
      { text: "Entra nella classifica della Ciurma", icon: "🏆" },
      { text: "Inizia a conquistare le Imprese", icon: "🎯" },
      { text: "Progressione e statistiche personali", icon: "📊" },
      { text: "Matricola pirata e data arruolamento", icon: "📅" }
    ]
  },
  { 
    id: "corsaro", 
    label: "Corsaro", 
    visits: 5, 
    points: 30, 
    description: "La tua rotta comincia a farsi rispettare.",
    privileges: [
      { text: "+5 Dobloni bonus di passaggio", icon: "🪙" },
      { text: "Tutti i privilegi del Mozzo", icon: "⚔️" },
      { text: "Rotta Prioritaria (prenotazioni anticipate serate/eventi)", icon: "🧭" },
      { text: "La Voce della Ciurma (sondaggi e votazioni riservate)", icon: "🗳️" },
      { text: "Accesso a imprese ed esperienze Corsaro+", icon: "🎯" }
    ]
  },
  { 
    id: "capitano", 
    label: "Capitano", 
    visits: 10, 
    points: 60, 
    description: "Hai conquistato il comando della Ciurma.",
    privileges: [
      { text: "+5 Dobloni bonus di passaggio", icon: "🪙" },
      { text: "Tutti i privilegi del Corsaro", icon: "⚔️" },
      { text: "Priorità d'imbarco (liste d'attesa prioritarie)", icon: "🎟️" },
      { text: "Il Tavolo del Capitano (zona di preferenza tavolo)", icon: "⚓" },
      { text: "Parola al Capitano (proponi sfide, canzoni e domande)", icon: "🗣️" },
      { text: "Accesso a sfide e tornei Capitano+", icon: "🎯" }
    ]
  },
  { 
    id: "leggenda", 
    label: "Leggenda",
    visits: 20, 
    points: 100, 
    description: "Il rango speciale riservato alle grandi rotte.",
    privileges: [
      { text: "+5 Dobloni bonus di passaggio", icon: "🪙" },
      { text: "Tutti i privilegi del Capitano", icon: "⚔️" },
      { text: "Numero storico di Leggenda (es. #0047)", icon: "🏅" },
      { text: "Inserimento nella Hall of Legends", icon: "📜" },
      { text: "Consiglio delle Leggende (scelta serate speciali)", icon: "👑" },
      { text: "Accesso alle anteprime assolute", icon: "✨" },
      { text: "Partecipazione al Raduno delle Leggende", icon: "🍻" }
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
