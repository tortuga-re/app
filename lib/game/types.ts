export type CaptainChallengeOutcomeType = "false_start" | "win" | "lose";

export type CaptainChallengeOffer = {
  title: string;
  description: string;
  durationSeconds: number;
};

export type CaptainChallengeStartResponse = {
  gameId: string;
  explosionDelayMs: number;
  livesRemaining: number;
};

export type CaptainChallengeTapInput = {
  gameId: string;
};

export type CaptainChallengeTapResponse = {
  outcome: string;
  outcomeType: CaptainChallengeOutcomeType;
  reactionTimeMs: number;
  offer: CaptainChallengeOffer | null;
  offerDurationSeconds: number;
  livesRemaining: number;
};

export type CaptainChallengeRoundStatus = "open" | "closed";

export type CaptainChallengeRound = {
  gameId: string;
  playerId: string;
  startedAt: number;
  explosionDelayMs: number;
  status: CaptainChallengeRoundStatus;
  closedAt?: number;
};

export type CaptainChallengeLivesResponse = {
  lives: number;
  referralCode: string | null;
};

export type CaptainChallengeReferralCreateResponse = {
  referralCode: string;
  referralUrl: string;
  lives: number;
};

export type CaptainChallengeReferralClaimInput = {
  referralCode: string;
};

export type CaptainChallengeReferralClaimResponse = {
  claimed: boolean;
  reason:
    | "claimed"
    | "already_claimed"
    | "self_referral"
    | "not_found"
    | "missing_code";
  lives: number;
};
