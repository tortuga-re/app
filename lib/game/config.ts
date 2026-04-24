const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const minDelayMs = parsePositiveInteger(process.env.GAME_MIN_DELAY_MS, 2000);
const maxDelayMs = Math.max(
  minDelayMs,
  parsePositiveInteger(process.env.GAME_MAX_DELAY_MS, 6000),
);

export const captainChallengeConfig = {
  winWindowMs: parsePositiveInteger(process.env.WIN_WINDOW_MS, 250),
  minDelayMs,
  maxDelayMs,
  winOfferDurationSeconds: parsePositiveInteger(
    process.env.GAME_WIN_OFFER_DURATION_SECONDS,
    600,
  ),
  loseOfferDurationSeconds: parsePositiveInteger(
    process.env.GAME_LOSE_OFFER_DURATION_SECONDS,
    300,
  ),
  roundTtlMs: Math.max(maxDelayMs + 60_000, 120_000),
} as const;
