import { randomBytes } from "node:crypto";

import { createPersistentJsonStore } from "@/lib/server/persistent-json-store";

type PlayerRecord = {
  playerId: string;
  lives: number;
  referralCode?: string;
  claimedReferralCodes: string[];
  createdAt: number;
  updatedAt: number;
};

type PlayerStore = {
  players: Record<string, PlayerRecord>;
  referralOwners: Record<string, string>;
};

const playerStateStore = createPersistentJsonStore<PlayerStore>({
  key: "tortuga:captain-challenge:players",
  localFile: ".data/captain-challenge-players.json",
  initialState: () => ({
    players: {},
    referralOwners: {},
  }),
  requireRedisInProduction: true,
});

const createEmptyPlayerStore = (): PlayerStore => ({
  players: {},
  referralOwners: {},
});

const normalizeStore = (store?: PlayerStore): PlayerStore => ({
  players: store?.players ?? {},
  referralOwners: store?.referralOwners ?? {},
});

const ensurePlayerInStore = (store: PlayerStore, playerId: string) => {
  const existing = store.players[playerId];

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const created: PlayerRecord = {
    playerId,
    lives: 1,
    claimedReferralCodes: [],
    createdAt: now,
    updatedAt: now,
  };

  store.players[playerId] = created;
  return created;
};

export const ensurePlayer = async (playerId: string) => {
  const nextStore = await playerStateStore.update((rawStore) => {
    const store = normalizeStore(rawStore);
    ensurePlayerInStore(store, playerId);
    return store;
  });

  return normalizeStore(nextStore).players[playerId];
};

export const getPlayerLives = async (playerId: string) => {
  const player = await ensurePlayer(playerId);
  return player.lives;
};

export const consumePlayerLife = async (playerId: string) => {
  let consumed = false;

  await playerStateStore.update((rawStore) => {
    const store = normalizeStore(rawStore);
    const player = ensurePlayerInStore(store, playerId);

    if (player.lives <= 0) {
      return store;
    }

    player.lives -= 1;
    player.updatedAt = Date.now();
    consumed = true;
    return store;
  });

  return consumed;
};

export const addPlayerLife = async (playerId: string) => {
  const nextStore = await playerStateStore.update((rawStore) => {
    const store = normalizeStore(rawStore);
    const player = ensurePlayerInStore(store, playerId);
    player.lives += 1;
    player.updatedAt = Date.now();
    return store;
  });

  return normalizeStore(nextStore).players[playerId].lives;
};

const createReferralCode = () => randomBytes(12).toString("base64url");

export const getOrCreateReferralCode = async (playerId: string) => {
  const nextStore = await playerStateStore.update((rawStore) => {
    const store = normalizeStore(rawStore);
    const player = ensurePlayerInStore(store, playerId);

    if (player.referralCode) {
      return store;
    }

    let referralCode = createReferralCode();
    while (store.referralOwners[referralCode]) {
      referralCode = createReferralCode();
    }

    player.referralCode = referralCode;
    player.updatedAt = Date.now();
    store.referralOwners[referralCode] = playerId;

    return store;
  });

  return normalizeStore(nextStore).players[playerId].referralCode ?? "";
};

export const claimReferralCode = async (
  rawReferralCode: string | undefined,
  claimerPlayerId: string,
) => {
  const referralCode = rawReferralCode?.trim();
  let result:
    | {
        claimed: boolean;
        reason: "missing_code" | "not_found" | "self_referral" | "already_claimed" | "claimed";
        lives: number;
      }
    | null = null;

  const nextStore = await playerStateStore.update((rawStore) => {
    const store = normalizeStore(rawStore);
    const claimer = ensurePlayerInStore(store, claimerPlayerId);

    if (!referralCode) {
      result = {
        claimed: false,
        reason: "missing_code",
        lives: claimer.lives,
      };
      return store;
    }

    const referrerPlayerId = store.referralOwners[referralCode];

    if (!referrerPlayerId) {
      result = {
        claimed: false,
        reason: "not_found",
        lives: claimer.lives,
      };
      return store;
    }

    if (referrerPlayerId === claimerPlayerId) {
      result = {
        claimed: false,
        reason: "self_referral",
        lives: claimer.lives,
      };
      return store;
    }

    if (claimer.claimedReferralCodes.includes(referralCode)) {
      result = {
        claimed: false,
        reason: "already_claimed",
        lives: claimer.lives,
      };
      return store;
    }

    claimer.claimedReferralCodes.push(referralCode);
    claimer.updatedAt = Date.now();

    const referrer = ensurePlayerInStore(store, referrerPlayerId);
    referrer.lives += 1;
    referrer.updatedAt = Date.now();

    result = {
      claimed: true,
      reason: "claimed",
      lives: claimer.lives,
    };

    return store;
  });

  if (result) {
    return result;
  }

  const finalStore = normalizeStore(nextStore ?? createEmptyPlayerStore());
  return {
    claimed: false,
    reason: "not_found" as const,
    lives: finalStore.players[claimerPlayerId]?.lives ?? 1,
  };
};
