import type {
  MatchDrinkForecastSummary,
  MatchDrinkMatch,
  MatchDrinkMeetingTableOption,
  MatchDrinkPlayer,
} from "./types";

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

const getTableKey = (table: MatchDrinkTableDefinition) => `${table.area}::${table.number}`;

const expandTableSlots = (tables: MatchDrinkTableDefinition[]) =>
  tables.flatMap((table) =>
    Array.from({ length: Math.max(1, Math.floor(table.seats / 2)) }, (_, index) => ({
      ...table,
      slotIndex: index,
    })),
  );

const ROMANCE_SLOTS = expandTableSlots(ROMANCE_TABLES);
const FRIENDSHIP_SLOTS = expandTableSlots(FRIENDSHIP_TABLES);

const getFilteredSlots = (
  slots: MatchDrinkTableSlot[],
  excludedTableKeys: string[],
) => {
  const excluded = new Set(excludedTableKeys);
  return slots.filter((slot) => !excluded.has(getTableKey(slot)));
};

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
  excludedTableKeys: string[] = [],
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

  const romanceSlots = getFilteredSlots(ROMANCE_SLOTS, excludedTableKeys);
  const friendshipSlots = getFilteredSlots(FRIENDSHIP_SLOTS, excludedTableKeys);

  romanceMatches.forEach((match, index) => {
    const slot = romanceSlots[index] ?? romanceSlots[romanceSlots.length - 1];
    if (slot) {
      assignments.set(match.id, buildAssignment("romance", slot));
    }
  });

  friendshipMatches.forEach((match, index) => {
    const slot =
      friendshipSlots[index] ?? friendshipSlots[friendshipSlots.length - 1];
    if (slot) {
      assignments.set(match.id, buildAssignment("friendship", slot));
    }
  });

  return assignments;
};

const isGenderCompatible = (playerA: MatchDrinkPlayer, playerB: MatchDrinkPlayer): boolean => {
  const checkCompatibility = (sourcePlayer: MatchDrinkPlayer, targetPlayer: MatchDrinkPlayer) => {
    if (sourcePlayer.lookingFor === "amicizie") {
      return targetPlayer.lookingFor === "amicizie";
    }

    if (sourcePlayer.lookingFor === "uomo") {
      return targetPlayer.gender === "uomo" && targetPlayer.lookingFor !== "amicizie";
    }

    if (sourcePlayer.lookingFor === "donna") {
      return targetPlayer.gender === "donna" && targetPlayer.lookingFor !== "amicizie";
    }

    if (sourcePlayer.lookingFor === "entrambi") {
      return ["uomo", "donna"].includes(targetPlayer.gender) && targetPlayer.lookingFor !== "amicizie";
    }

    return false;
  };

  return checkCompatibility(playerA, playerB) && checkCompatibility(playerB, playerA);
};

export const getMatchDrinkMeetingTableOptions = (): MatchDrinkMeetingTableOption[] => {
  const toOption = (
    zone: "romance" | "friendship",
    table: MatchDrinkTableDefinition,
  ): MatchDrinkMeetingTableOption => ({
    key: getTableKey(table),
    area: table.area,
    number: table.number,
    seats: table.seats,
    zone,
    slots: Math.max(1, Math.floor(table.seats / 2)),
    label: `${table.number} in ${table.area}`,
  });

  return [
    ...ROMANCE_TABLES.map((table) => toOption("romance", table)),
    ...FRIENDSHIP_TABLES.map((table) => toOption("friendship", table)),
  ];
};

export const getMatchDrinkCapacitySummary = (excludedTableKeys: string[] = []) => {
  const excluded = new Set(excludedTableKeys);
  const countSlots = (tables: MatchDrinkTableDefinition[]) =>
    tables
      .filter((table) => !excluded.has(getTableKey(table)))
      .reduce((total, table) => total + Math.max(1, Math.floor(table.seats / 2)), 0);

  return {
    romanceCapacity: countSlots(ROMANCE_TABLES),
    friendshipCapacity: countSlots(FRIENDSHIP_TABLES),
  };
};

export const forecastMatchDrinkPairs = (
  players: MatchDrinkPlayer[],
  excludedTableKeys: string[] = [],
): MatchDrinkForecastSummary => {
  const eligiblePlayers = players.filter((player) => player.relationshipStatus !== "solo_per_ridere");
  const matchedIds = new Set<string>();
  let friendshipPairs = 0;
  let romancePairs = 0;

  for (let i = 0; i < eligiblePlayers.length; i += 1) {
    const playerA = eligiblePlayers[i];
    if (matchedIds.has(playerA.id)) continue;

    for (let j = i + 1; j < eligiblePlayers.length; j += 1) {
      const playerB = eligiblePlayers[j];
      if (matchedIds.has(playerB.id)) continue;
      if (!isGenderCompatible(playerA, playerB)) continue;

      if (isFriendshipMatch(playerA, playerB)) {
        friendshipPairs += 1;
      } else {
        romancePairs += 1;
      }

      matchedIds.add(playerA.id);
      matchedIds.add(playerB.id);
      break;
    }
  }

  const capacities = getMatchDrinkCapacitySummary(excludedTableKeys);

  return {
    romancePairs,
    friendshipPairs,
    unmatchedPlayers: eligiblePlayers.length - matchedIds.size,
    romanceCapacity: capacities.romanceCapacity,
    friendshipCapacity: capacities.friendshipCapacity,
  };
};
