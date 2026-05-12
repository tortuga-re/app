import type { MatchDrinkMatch, MatchDrinkPlayer } from "./types";

type MatchDrinkMeetingZone = "romance" | "friendship";

type MatchDrinkTableDefinition = {
  area: string;
  number: string;
  seats: number;
};

type MatchDrinkTableSlot = MatchDrinkTableDefinition & {
  slotIndex: number;
};

export type MatchDrinkMeetingAssignment = {
  zone: MatchDrinkMeetingZone;
  tableArea: string;
  tableNumber: string;
  tableSeats: number;
  tableLabel: string;
};

const ROMANCE_TABLES: MatchDrinkTableDefinition[] = [
  { area: "Sala Centrale", number: "20", seats: 2 },
  { area: "Sala Centrale", number: "21", seats: 4 },
  { area: "Sala Centrale", number: "22", seats: 2 },
  { area: "Sala Centrale", number: "23", seats: 4 },
  { area: "Sala Centrale", number: "24", seats: 2 },
  { area: "Sala Centrale", number: "25", seats: 2 },
  { area: "Sala Centrale", number: "26", seats: 2 },
  { area: "Sala Centrale", number: "27", seats: 2 },
  { area: "Sala Centrale", number: "28", seats: 2 },
  { area: "Sala Centrale", number: "29", seats: 2 },
  { area: "Soppalco", number: "30", seats: 2 },
  { area: "Soppalco", number: "31", seats: 2 },
  { area: "Soppalco", number: "32", seats: 2 },
  { area: "Soppalco", number: "33", seats: 2 },
  { area: "Soppalco", number: "34", seats: 2 },
  { area: "Soppalco", number: "35", seats: 2 },
  { area: "Soppalco", number: "36", seats: 4 },
  { area: "Soppalco", number: "37", seats: 4 },
  { area: "Soppalco", number: "38", seats: 4 },
];

const FRIENDSHIP_TABLES: MatchDrinkTableDefinition[] = [
  { area: "Galeone", number: "10", seats: 6 },
  { area: "Galeone", number: "11", seats: 6 },
  { area: "Galeone", number: "12", seats: 6 },
  { area: "Galeone", number: "13", seats: 6 },
  { area: "Galeone", number: "14", seats: 6 },
  { area: "Galeone", number: "15", seats: 6 },
  { area: "Galeone", number: "16", seats: 6 },
  { area: "Galeone", number: "17", seats: 6 },
];

const expandTableSlots = (tables: MatchDrinkTableDefinition[]) =>
  tables.flatMap((table) =>
    Array.from({ length: Math.max(1, Math.floor(table.seats / 2)) }, (_, index) => ({
      ...table,
      slotIndex: index,
    })),
  );

const ROMANCE_SLOTS = expandTableSlots(ROMANCE_TABLES);
const FRIENDSHIP_SLOTS = expandTableSlots(FRIENDSHIP_TABLES);

const buildAssignment = (
  zone: MatchDrinkMeetingZone,
  slot: MatchDrinkTableSlot,
): MatchDrinkMeetingAssignment => ({
  zone,
  tableArea: slot.area,
  tableNumber: slot.number,
  tableSeats: slot.seats,
  tableLabel: `${slot.number} in ${slot.area}`,
});

const isFriendshipMatch = (
  playerA?: MatchDrinkPlayer,
  playerB?: MatchDrinkPlayer,
) =>
  playerA?.lookingFor === "amicizie" && playerB?.lookingFor === "amicizie";

const compareMatches = (left: MatchDrinkMatch, right: MatchDrinkMatch) => {
  const createdComparison = (left.createdAt ?? "").localeCompare(right.createdAt ?? "");
  if (createdComparison !== 0) {
    return createdComparison;
  }

  const leftKey = `${left.playerAId}|${left.playerBId}|${left.id}`;
  const rightKey = `${right.playerAId}|${right.playerBId}|${right.id}`;
  return leftKey.localeCompare(rightKey);
};

export const assignMatchDrinkMeetingTables = (
  matches: MatchDrinkMatch[],
  players: MatchDrinkPlayer[],
) => {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const sortedMatches = [...matches].sort(compareMatches);
  const friendshipMatches: MatchDrinkMatch[] = [];
  const romanceMatches: MatchDrinkMatch[] = [];

  sortedMatches.forEach((match) => {
    const playerA = playersById.get(match.playerAId);
    const playerB = playersById.get(match.playerBId);

    if (isFriendshipMatch(playerA, playerB)) {
      friendshipMatches.push(match);
      return;
    }

    romanceMatches.push(match);
  });

  const assignments = new Map<string, MatchDrinkMeetingAssignment>();

  romanceMatches.forEach((match, index) => {
    const slot = ROMANCE_SLOTS[index] ?? ROMANCE_SLOTS[ROMANCE_SLOTS.length - 1];
    if (slot) {
      assignments.set(match.id, buildAssignment("romance", slot));
    }
  });

  friendshipMatches.forEach((match, index) => {
    const slot =
      FRIENDSHIP_SLOTS[index] ?? FRIENDSHIP_SLOTS[FRIENDSHIP_SLOTS.length - 1];
    if (slot) {
      assignments.set(match.id, buildAssignment("friendship", slot));
    }
  });

  return assignments;
};
