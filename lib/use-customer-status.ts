"use client";

import { useEffect, useState } from "react";

import { requestJson } from "@/lib/client";
import { normalizeCustomerEmail } from "@/lib/customer-identity";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import type { ProfileResponse } from "@/lib/cooperto/types";

export type CustomerStatusState = {
  email: string;
  loading: boolean;
  hasProfile: boolean;
  profile: ProfileResponse | null;
  points: number;
  visits: number;
  tierLabel: string;
  isVip: boolean;
  activeCardCode: string;
  hasReservation: boolean;
  hasCoupon: boolean;
};

const baseStatus = (email = "", loading = false) => {
  const progress = getFidelityRewardProgress(0);

  return {
    email,
    loading,
    hasProfile: false,
    profile: null,
    points: progress.points,
    visits: 0,
    tierLabel: progress.loyaltyTier.label,
    isVip: progress.isVip,
    activeCardCode: "",
    hasReservation: false,
    hasCoupon: false,
  } satisfies CustomerStatusState;
};

const hasExplicitVipCard = (response: ProfileResponse) =>
  [
    response.contact?.NomeCardAssegnata,
    response.contact?.CodiceCardAssegnata,
    ...(response.contact?.Tags ?? []),
  ].some((value) => /\bvip\b/i.test(value?.trim() ?? ""));

export function useCustomerStatus(email?: string): CustomerStatusState {
  const normalizedEmail = normalizeCustomerEmail(email);
  const [state, setState] = useState<CustomerStatusState>(baseStatus);
  const fallbackState = baseStatus();

  useEffect(() => {
    if (!normalizedEmail) {
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      try {
        const params = new URLSearchParams({
          mode: "email",
          query: normalizedEmail,
        });
        const response = await requestJson<ProfileResponse>(`/api/profile?${params.toString()}`);
        const progress = getFidelityRewardProgress(
          response.points ?? response.contact?.SaldoPuntiCard ?? 0,
        );

        if (cancelled) {
          return;
        }

        setState({
          email: normalizedEmail,
          loading: false,
          hasProfile: Boolean(response.contact),
          profile: response,
          points: progress.points,
          visits: Math.max(0, response.contact?.NumeroVisite ?? 0),
          tierLabel: progress.loyaltyTier.label,
          isVip: progress.isVip || hasExplicitVipCard(response),
          activeCardCode: response.contact?.CodiceCard?.trim() ?? "",
          hasReservation: response.upcomingReservations.length > 0,
          hasCoupon: response.coupons.length > 0,
        });
      } catch {
        if (!cancelled) {
          setState(baseStatus(normalizedEmail));
        }
      }
    };

    void loadStatus();
    window.addEventListener("tortuga:profile-updated", loadStatus);

    return () => {
      cancelled = true;
      window.removeEventListener("tortuga:profile-updated", loadStatus);
    };
  }, [normalizedEmail]);

  return normalizedEmail && state.email === normalizedEmail
    ? state
    : normalizedEmail
      ? baseStatus(normalizedEmail, true)
      : fallbackState;
}
