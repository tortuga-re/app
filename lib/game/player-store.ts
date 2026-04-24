import { randomBytes } from "node:crypto";

type PlayerRecord = {
  playerId: string;
  lives: number;
  referralCode?: string;
  claimedReferralCodes: Set<string>;
  createdAt: number;
  updatedAt: number;
};

type PlayerStore = {
  players: Map<string, PlayerRecord>;
  referralOwners: Map<string, string>;
};

const globalStore = globalThis as typeof globalThis & {
  __tortugaCaptainChallengePlayers?: PlayerStore;
};

const getPlayerStore = () => {
  if (!globalStore.__tortugaCaptainChallengePlayers) {
    globalStore.__tortugaCaptainChallengePlayers = {
      players: new Map(),
      referralOwners: new Map(),
    };
  }

  return globalStore.__tortugaCaptainChallengePlayers;
};

export const ensurePlayer = (playerId: string) => {
  const store = getPlayerStore();
  const existing = store.players.get(playerId);

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const created: PlayerRecord = {
    playerId,
    lives: 1,
    claimedReferralCodes: new Set(),
    createdAt: now,
    updatedAt: now,
  };

  store.players.set(playerId, created);
  return created;
};

export const getPlayerLives = (playerId: string) => ensurePlayer(playerId).lives;

export const consumePlayerLife = (playerId: string) => {
  const player = ensurePlayer(playerId);

  if (player.lives <= 0) {
    return false;
  }

  player.lives -= 1;
  player.updatedAt = Date.now();
  return true;
};

export const addPlayerLife = (playerId: string) => {
  const player = ensurePlayer(playerId);
  player.lives += 1;
  player.updatedAt = Date.now();
  return player.lives;
};

const createReferralCode = () => randomBytes(12).toString("base64url");

export const getOrCreateReferralCode = (playerId: string) => {
  const store = getPlayerStore();
  const player = ensurePlayer(playerId);

  if (player.referralCode) {
    return player.referralCode;
  }

  let referralCode = createReferralCode();
  while (store.referralOwners.has(referralCode)) {
    referralCode = createReferralCode();
  }

  player.referralCode = referralCode;
  player.updatedAt = Date.now();
  store.referralOwners.set(referralCode, playerId);

  return referralCode;
};

export const claimReferralCode = (
  rawReferralCode: string | undefined,
  claimerPlayerId: string,
) => {
  const referralCode = rawReferralCode?.trim();
  const claimer = ensurePlayer(claimerPlayerId);

  if (!referralCode) {
    return {
      claimed: false,
      reason: "missing_code" as const,
      lives: claimer.lives,
    };
  }

  const store = getPlayerStore();
  const referrerPlayerId = store.referralOwners.get(referralCode);

  if (!referrerPlayerId) {
    return {
      claimed: false,
      reason: "not_found" as const,
      lives: claimer.lives,
    };
  }

  if (referrerPlayerId === claimerPlayerId) {
    return {
      claimed: false,
      reason: "self_referral" as const,
      lives: claimer.lives,
    };
  }

  if (claimer.claimedReferralCodes.has(referralCode)) {
    return {
      claimed: false,
      reason: "already_claimed" as const,
      lives: claimer.lives,
    };
  }

  claimer.claimedReferralCodes.add(referralCode);
  claimer.updatedAt = Date.now();
  addPlayerLife(referrerPlayerId);

  return {
    claimed: true,
    reason: "claimed" as const,
    lives: claimer.lives,
  };
};

// TODO production-ready: persist players, lives, referral codes and claims in
// Redis or a database keyed to authenticated Cooperto/email identities. The MVP
// uses cookies plus in-memory state and cannot enforce cross-device abuse limits.
