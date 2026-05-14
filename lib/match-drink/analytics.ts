import "server-only";

import type { MatchDrinkSessionAnalytics } from "@/lib/match-drink/types";
import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";

const getMetricsKey = (sessionId: string) => `match_drink_metrics:${sessionId}`;

const createEmptyMetrics = (): MatchDrinkSessionAnalytics => ({
  signups: 0,
  matchesCalculated: 0,
  acceptedMatches: 0,
  drinksUnlocked: 0,
  drinksRedeemed: 0,
  lastCalculatedAt: null,
  updatedAt: new Date().toISOString(),
});

export const getMatchDrinkAnalytics = async (
  sessionId: string,
): Promise<MatchDrinkSessionAnalytics> =>
  getAppStateJson<MatchDrinkSessionAnalytics>(
    getMetricsKey(sessionId),
    createEmptyMetrics(),
  );

export const updateMatchDrinkAnalytics = async (
  sessionId: string,
  updater: (
    current: MatchDrinkSessionAnalytics,
  ) => MatchDrinkSessionAnalytics,
) => {
  const nextMetrics = updater(await getMatchDrinkAnalytics(sessionId));
  const stampedMetrics: MatchDrinkSessionAnalytics = {
    ...nextMetrics,
    updatedAt: new Date().toISOString(),
  };

  await setAppStateJson(getMetricsKey(sessionId), stampedMetrics);
  return stampedMetrics;
};

export const recordMatchDrinkSignup = async (sessionId: string) =>
  updateMatchDrinkAnalytics(sessionId, (current) => ({
    ...current,
    signups: current.signups + 1,
  }));

export const recordMatchDrinkMatchesCalculated = async (
  sessionId: string,
  matchesCalculated: number,
) =>
  updateMatchDrinkAnalytics(sessionId, (current) => ({
    ...current,
    matchesCalculated,
    lastCalculatedAt: new Date().toISOString(),
  }));

export const syncMatchDrinkOutcomeMetrics = async (
  sessionId: string,
  payload: {
    acceptedMatches: number;
    drinksUnlocked: number;
    drinksRedeemed: number;
  },
) =>
  updateMatchDrinkAnalytics(sessionId, (current) => ({
    ...current,
    acceptedMatches: payload.acceptedMatches,
    drinksUnlocked: payload.drinksUnlocked,
    drinksRedeemed: payload.drinksRedeemed,
  }));
