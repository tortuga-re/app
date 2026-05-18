import * as React from "react";
import { cn } from "@/lib/utils";
import type { ProfileResponse } from "@/lib/cooperto/types";
import type { FidelityRewardProgress } from "@/lib/fidelity-rewards";
import type { Mission } from "@/lib/missions";

export interface ProfileDashboardProps {
  data: ProfileResponse;
  loyaltyProgress: FidelityRewardProgress;
  missions: Mission[];
  setSelectedMission: (mission: Mission) => void;
  triggerHaptic: () => void;
  hasOnPremiseAccess: boolean;
}

export function ProfileDashboard({
  data,
  loyaltyProgress,
  missions,
  setSelectedMission,
  triggerHaptic,
  hasOnPremiseAccess,
}: ProfileDashboardProps) {
  return (
    <div className="panel mb-5 rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Diario di bordo</p>
          <h2 className="text-xl font-semibold text-white">
            La tua ciurma prende forma
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Visite, bottino e progressi fedeltà raccolti in un colpo solo.
          </p>
        </div>
        {hasOnPremiseAccess ? (
          <span className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent-soft)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Sei nel locale
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel-muted rounded-[1.4rem] px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Visite registrate
          </p>
          <p className="mt-2 text-2xl font-black text-white">
            {data.contact?.NumeroVisite ?? 0}
          </p>
        </div>
        <div className="panel-muted rounded-[1.4rem] px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Coupon attivi
          </p>
          <p className="mt-2 text-2xl font-black text-white">
            {data.coupons.filter((coupon) => !coupon.Utilizzato).length}
          </p>
        </div>
        <div className="panel-muted rounded-[1.4rem] px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Prossima ricompensa
          </p>
          <p className="mt-2 text-sm font-bold text-white">
            {loyaltyProgress.nextReward?.label || "Rotta VIP"}
          </p>
        </div>
        <div className="panel-muted rounded-[1.4rem] px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Imprese sbloccate
          </p>
          <p className="mt-2 text-2xl font-black text-white">
            {missions.filter((mission) => mission.isUnlocked(data)).length}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Le tue Imprese
          </p>
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {missions.filter((m) => m.isUnlocked(data)).length} / {missions.length} Sbloccate
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden mask-fade-right">
          {missions.map((mission) => {
            const isUnlocked = mission.isUnlocked(data);
            return (
              <button
                key={mission.id}
                onClick={() => {
                  triggerHaptic();
                  setSelectedMission(mission);
                }}
                className="group relative flex flex-col items-center gap-2 flex-shrink-0 outline-none"
              >
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-500 overflow-hidden",
                    isUnlocked
                      ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] shadow-[0_0_15px_rgba(216,176,106,0.3)]"
                      : "border-white/5 bg-white/5 grayscale opacity-30"
                  )}
                >
                  {mission.image ? (
                    <img
                      src={mission.image}
                      alt={mission.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{mission.icon}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[9px] font-bold text-center uppercase tracking-tight leading-tight w-20 break-words",
                    isUnlocked ? "text-white" : "text-[var(--text-muted)]"
                  )}
                >
                  {mission.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
