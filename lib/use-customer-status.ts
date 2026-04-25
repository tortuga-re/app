"use client";

import { useEffect, useState } from "react";

import { requestJson } from "@/lib/client";
import { normalizeCustomerEmail } from "@/lib/customer-identity";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import type { ProfileResponse } from "@/lib/cooperto/types";

type CustomerStatusState = {
  points: number;
  tierLabel: string;
  isVip: boolean;
};

const baseStatus = () => {
  const progress = getFidelityRewardProgress(0);

  return {
    points: progress.points,
    tierLabel: progress.loyaltyTier.label,
    isVip: progress.isVip,
  } satisfies CustomerStatusState;
};

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
          points: progress.points,
          tierLabel: progress.loyaltyTier.label,
          isVip: progress.isVip,
        });
      } catch {
        if (!cancelled) {
          setState(baseStatus());
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [normalizedEmail]);

  return normalizedEmail ? state : fallbackState;
}
