import {
  fidelityRewardTiers,
  fidelityVipThreshold,
  type FidelityRewardTier,
} from "@/lib/fidelity-rewards.config";

export type FidelityRewardProgress = {
  points: number;
  currentReward: FidelityRewardTier | null;
  nextReward: FidelityRewardTier | null;
  progressPercent: number;
  isVip: boolean;
  isMaxTierReached: boolean;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

export const getFidelityRewardProgress = (
  rawPoints: number | null | undefined,
): FidelityRewardProgress => {
  const points = Math.max(0, Math.floor(rawPoints ?? 0));
  const currentReward =
    [...fidelityRewardTiers].reverse().find((tier) => points >= tier.threshold) ?? null;
  const nextReward =
    fidelityRewardTiers.find((tier) => points < tier.threshold) ?? null;
  const previousThreshold = currentReward?.threshold ?? 0;
  const nextThreshold = nextReward?.threshold ?? previousThreshold;

  const progressPercent = nextReward
    ? clampPercent(
        ((points - previousThreshold) / Math.max(nextThreshold - previousThreshold, 1)) *
          100,
      )
    : 100;

  return {
    points,
    currentReward,
    nextReward,
    progressPercent,
    isVip: points >= fidelityVipThreshold,
    isMaxTierReached: !nextReward,
  };
};
