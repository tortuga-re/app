import type {
  MatchDrinkAnswer,
  MatchDrinkForecastSummary,
  MatchDrinkMatch,
  MatchDrinkMeetingTableOption,
  MatchDrinkPlayer,
  MatchDrinkQuestion,
} from "./types";
import { calculateMatchScore, calculatePlayerProfile } from "./scoring";

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

const buildFriendshipMatchGroups = (matchCount: number) => {
  if (matchCount <= 0) {
    return [];
  }

  if (matchCount === 1) {
    return [1];
  }

  if (matchCount === 2) {
    return [2];
  }

  if (matchCount === 3) {
    return [3];
  }

  if (matchCount === 4) {
    return [2, 2];
  }

  const base = Math.floor(matchCount / 3);
  const remainder = matchCount % 3;
  if (remainder === 0) {
    return Array.from({ length: base }, () => 3);
  }

  if (remainder === 1) {
    return [...Array.from({ length: base - 1 }, () => 3), 2, 2];
  }

  return [...Array.from({ length: base }, () => 3), 2];
};

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

type FriendshipMatchBundle = {
  match: MatchDrinkMatch;
  score: number;
};

type FriendshipScoringContext = {
  playersById: Map<string, MatchDrinkPlayer>;
  profilesByPlayerId: Map<string, ReturnType<typeof calculatePlayerProfile>>;
  answersByPlayerId: Map<string, MatchDrinkAnswer[]>;
  questionsBank: MatchDrinkQuestion[];
};

const getFriendshipPairCompatibility = (
  left: MatchDrinkMatch,
  right: MatchDrinkMatch,
  context: FriendshipScoringContext,
) => {
  const leftPlayers = [
    context.playersById.get(left.playerAId),
    context.playersById.get(left.playerBId),
  ].filter(Boolean) as MatchDrinkPlayer[];
  const rightPlayers = [
    context.playersById.get(right.playerAId),
    context.playersById.get(right.playerBId),
  ].filter(Boolean) as MatchDrinkPlayer[];

  if (leftPlayers.length < 2 || rightPlayers.length < 2) {
    return 0;
  }

  const leftA = leftPlayers[0];
  const leftB = leftPlayers[1];
  const rightA = rightPlayers[0];
  const rightB = rightPlayers[1];

  const score = (
    a: MatchDrinkPlayer,
    b: MatchDrinkPlayer,
  ) => calculateMatchScore(
    a,
    b,
    context.profilesByPlayerId.get(a.id)!,
    context.profilesByPlayerId.get(b.id)!,
    context.answersByPlayerId.get(a.id) ?? [],
    context.answersByPlayerId.get(b.id) ?? [],
    context.questionsBank,
  ).score;

  const crossScores = [
    score(leftA, rightA),
    score(leftA, rightB),
    score(leftB, rightA),
    score(leftB, rightB),
  ];

  return crossScores.reduce((total, value) => total + value, 0) / crossScores.length;
};

const selectBestFriendshipBundle = (
  available: FriendshipMatchBundle[],
  size: number,
  context: FriendshipScoringContext,
) => {
  if (available.length === 0) {
    return [];
  }

  if (size === 1 || available.length === 1) {
    return [available[0]];
  }

  if (size === 2 || available.length === 2) {
    let bestScore = -Infinity;
    let bestBundle: FriendshipMatchBundle[] = [available[0], available[1]];

    for (let i = 0; i < available.length; i += 1) {
      for (let j = i + 1; j < available.length; j += 1) {
        const score = getFriendshipPairCompatibility(available[i].match, available[j].match, context);
        if (score > bestScore) {
          bestScore = score;
          bestBundle = [available[i], available[j]];
        }
      }
    }

    return bestBundle;
  }

  let bestScore = -Infinity;
  let bestBundle: FriendshipMatchBundle[] = available.slice(0, 3);

  for (let i = 0; i < available.length; i += 1) {
    for (let j = i + 1; j < available.length; j += 1) {
      for (let k = j + 1; k < available.length; k += 1) {
        const bundle = [available[i], available[j], available[k]];
        const score =
          getFriendshipPairCompatibility(bundle[0].match, bundle[1].match, context) +
          getFriendshipPairCompatibility(bundle[0].match, bundle[2].match, context) +
          getFriendshipPairCompatibility(bundle[1].match, bundle[2].match, context);

        if (score > bestScore) {
          bestScore = score;
          bestBundle = bundle;
        }
      }
    }
  }

  return bestBundle;
};

export const assignMatchDrinkMeetingTables = (
  matches: MatchDrinkMatch[],
  players: MatchDrinkPlayer[],
  answers: MatchDrinkAnswer[] = [],
  questionsBank: MatchDrinkQuestion[] = [],
  secondaryTraitMode: "macro_category" | "absolute" = "absolute",
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
  const answersByPlayerId = new Map<string, MatchDrinkAnswer[]>();
  answers.forEach((answer) => {
    const current = answersByPlayerId.get(answer.playerId) ?? [];
    current.push(answer);
    answersByPlayerId.set(answer.playerId, current);
  });
  const profilesByPlayerId = new Map<string, ReturnType<typeof calculatePlayerProfile>>();
  players.forEach((player) => {
    profilesByPlayerId.set(
        player.id,
        calculatePlayerProfile(
          player,
          answersByPlayerId.get(player.id) ?? [],
          questionsBank,
          undefined,
          secondaryTraitMode,
        ),
      );
  });

  const romanceSlots = getFilteredSlots(ROMANCE_SLOTS, excludedTableKeys);
  const friendshipSlots = getFilteredSlots(FRIENDSHIP_SLOTS, excludedTableKeys);

  romanceMatches.forEach((match, index) => {
    const slot = romanceSlots[index] ?? romanceSlots[romanceSlots.length - 1];
    if (slot) {
      assignments.set(match.id, buildAssignment("romance", slot));
    }
  });

  const friendshipGroups = buildFriendshipMatchGroups(friendshipMatches.length);
  let remainingFriendshipMatches = [...friendshipMatches];
  const friendshipContext: FriendshipScoringContext = {
    playersById,
    profilesByPlayerId,
    answersByPlayerId,
    questionsBank,
  };

  friendshipGroups.forEach((groupSize, groupIndex) => {
    const slot = friendshipSlots[groupIndex] ?? friendshipSlots[friendshipSlots.length - 1];
    if (!slot || remainingFriendshipMatches.length === 0) {
      return;
    }

    const selected = selectBestFriendshipBundle(
      remainingFriendshipMatches.map((match) => ({ match, score: match.score })),
      Math.min(groupSize, remainingFriendshipMatches.length),
      friendshipContext,
    );

    selected.forEach((bundle) => {
      assignments.set(bundle.match.id, buildAssignment("friendship", slot));
    });

    const selectedIds = new Set(selected.map((bundle) => bundle.match.id));
    remainingFriendshipMatches = remainingFriendshipMatches.filter((match) => !selectedIds.has(match.id));
  });

  return assignments;
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

type ForecastPair = {
  aIdx: number;
  bIdx: number;
};

type ForecastMatchingResult = {
  pairCount: number;
  pairs: ForecastPair[];
};

const FORECAST_BIGINT_ZERO = BigInt(0);
const FORECAST_BIGINT_ONE = BigInt(1);

const getForecastBit = (index: number) => FORECAST_BIGINT_ONE << BigInt(index);

const getFirstForecastSetBitIndex = (mask: bigint, playerCount: number) => {
  for (let index = 0; index < playerCount; index += 1) {
    if ((mask & getForecastBit(index)) !== FORECAST_BIGINT_ZERO) {
      return index;
    }
  }

  return -1;
};

const getForecastPairKey = (aIdx: number, bIdx: number) =>
  aIdx < bIdx ? `${aIdx}:${bIdx}` : `${bIdx}:${aIdx}`;

const findMaximumCompatibleForecastPairs = (
  playerCount: number,
  pairs: ForecastPair[],
) => {
  if (playerCount < 2) {
    return [];
  }

  const pairsByKey = new Map(
    pairs.map((pair) => [getForecastPairKey(pair.aIdx, pair.bIdx), pair]),
  );
  const fullMask = (FORECAST_BIGINT_ONE << BigInt(playerCount)) - FORECAST_BIGINT_ONE;
  const memo = new Map<string, ForecastMatchingResult>();

  const solve = (mask: bigint): ForecastMatchingResult => {
    if (mask === FORECAST_BIGINT_ZERO) {
      return { pairCount: 0, pairs: [] };
    }

    const key = mask.toString();
    const cached = memo.get(key);
    if (cached) {
      return cached;
    }

    const firstIdx = getFirstForecastSetBitIndex(mask, playerCount);
    const maskWithoutFirst = mask & ~getForecastBit(firstIdx);
    let best = solve(maskWithoutFirst);

    for (let secondIdx = firstIdx + 1; secondIdx < playerCount; secondIdx += 1) {
      const secondBit = getForecastBit(secondIdx);
      if ((maskWithoutFirst & secondBit) === FORECAST_BIGINT_ZERO) {
        continue;
      }

      const pair = pairsByKey.get(getForecastPairKey(firstIdx, secondIdx));
      if (!pair) {
        continue;
      }

      const rest = solve(maskWithoutFirst & ~secondBit);
      const candidate = {
        pairCount: rest.pairCount + 1,
        pairs: [pair, ...rest.pairs],
      };

      if (candidate.pairCount > best.pairCount) {
        best = candidate;
      }
    }

    memo.set(key, best);
    return best;
  };

  return solve(fullMask).pairs;
};

export const forecastMatchDrinkPairs = (
  players: MatchDrinkPlayer[],
  excludedTableKeys: string[] = [],
): MatchDrinkForecastSummary => {
  const eligiblePlayers = players.filter((player) => player.nickname !== "_SYSTEM_");
  const compatiblePairs: ForecastPair[] = [];

  for (let i = 0; i < eligiblePlayers.length; i += 1) {
    for (let j = i + 1; j < eligiblePlayers.length; j += 1) {
      if (isGenderCompatible(eligiblePlayers[i], eligiblePlayers[j])) {
        compatiblePairs.push({ aIdx: i, bIdx: j });
      }
    }
  }

  const forecastPairs = findMaximumCompatibleForecastPairs(
    eligiblePlayers.length,
    compatiblePairs,
  );
  const friendshipPairs = forecastPairs.filter((pair) =>
    isFriendshipMatch(eligiblePlayers[pair.aIdx], eligiblePlayers[pair.bIdx]),
  ).length;
  const romancePairs = forecastPairs.length - friendshipPairs;

  const capacities = getMatchDrinkCapacitySummary(excludedTableKeys);

  return {
    romancePairs,
    friendshipPairs,
    unmatchedPlayers: eligiblePlayers.length - forecastPairs.length * 2,
    romanceCapacity: capacities.romanceCapacity,
    friendshipCapacity: capacities.friendshipCapacity,
  };
};
