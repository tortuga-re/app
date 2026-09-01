"use client";

import * as React from "react";
import Image from "next/image";
import type { ProfileResponse } from "@/lib/cooperto/types";
import type { FidelityRewardProgress } from "@/lib/fidelity-rewards";
import { formatBirthDateLabel } from "@/lib/customer-profile";
import { fidelityLoyaltyTiers } from "@/lib/fidelity-rewards.config";
import { cn } from "@/lib/utils";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import dynamic from "next/dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FidelityActivationPanel = dynamic<any>(() => import("@/components/fidelity-activation-panel").then(mod => mod.FidelityActivationPanel).catch(() => ({ default: () => null } as any)), { ssr: false });

export interface ProfilePassportProps {
  data: ProfileResponse;
  contactSnapshot: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate: string;
  };
  identityEmail: string;
  profileName: string;
  loyaltyProgress: FidelityRewardProgress;
  contactError: string;
  contactMessage: string;
  isEditingProfile: boolean;
  isDataExpanded: boolean;
  setIsDataExpanded: (val: boolean) => void;
  activeCardCode: string | null;
  showActivatedCardPanel: boolean;
  contactCode: string;
  handleFidelityActivated: (profile: ProfileResponse) => void;
  triggerHaptic: () => void;
  setIsEditingProfile: (val: boolean) => void;
  setContactError: (val: string) => void;
  setContactMessage: (val: string) => void;
  openContactEditor: () => void;
  changeAccount: () => void;
}

export function ProfilePassport({
  data,
  contactSnapshot,
  identityEmail,
  profileName,
  loyaltyProgress,
  contactError,
  contactMessage,
  isEditingProfile,
  isDataExpanded,
  setIsDataExpanded,
  activeCardCode,
  showActivatedCardPanel,
  contactCode,
  handleFidelityActivated,
  triggerHaptic,
  setIsEditingProfile,
  setContactError,
  setContactMessage,
  openContactEditor,
  changeAccount,
}: ProfilePassportProps) {
  const [isTierListOpen, setIsTierListOpen] = React.useState(false);

  return (
    <div
      id="riconoscimento"
      className="panel hash-scroll-target rounded-[2rem] overflow-hidden p-5"
    >
      <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--accent-strong)]">
          Passaporto del pirata
        </p>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Documento Valido</span>
        </div>
      </div>

      <div className="relative z-20 flex min-w-0 items-center gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="truncate text-2xl font-semibold text-white">
            {profileName}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-[rgba(216,176,106,0.18)] bg-white/5 pl-1 pr-3 py-1 transition-colors hover:bg-white/10"
              onClick={() => setIsTierListOpen((value) => !value)}
              aria-expanded={isTierListOpen}
              aria-label={`Mostra i ranghi disponibili per ${loyaltyProgress.loyaltyTier.label}`}
            >
              {loyaltyProgress.loyaltyTier.image ? (
                <Image 
                  src={loyaltyProgress.loyaltyTier.image} 
                  alt={loyaltyProgress.loyaltyTier.label}
                  width={20}
                  height={20}
                  className="object-contain"
                />
              ) : null}
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                {loyaltyProgress.loyaltyTier.label}
              </span>
            </button>
            <span className="text-xs leading-5 text-[var(--text-muted)]">
              {loyaltyProgress.points} punti
            </span>
          </div>
          {isTierListOpen ? (
            <div className="mt-3 w-full max-w-[18rem] rounded-[1.25rem] border border-[rgba(216,176,106,0.18)] bg-[rgba(0,0,0,0.18)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Ranghi disponibili
              </p>
              <div className="mt-2 space-y-1.5">
                {fidelityLoyaltyTiers.map((tier, index) => (
                  <div
                    key={tier.label}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-full border px-3 py-1.5 text-sm",
                      tier.label === loyaltyProgress.loyaltyTier.label
                        ? "border-[rgba(216,176,106,0.35)] bg-[rgba(216,176,106,0.12)] text-white"
                        : "border-white/5 bg-white/[0.03] text-[var(--text-muted)]",
                    )}
                  >
                    <span className="font-semibold uppercase tracking-[0.08em]">{tier.label}</span>
                    <span className="text-[11px] font-semibold text-[var(--accent-strong)]">
                      {index === 0 ? "> 0" : `> ${tier.minPoints}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="my-8 border-t border-white/5" />

      {contactError ? (
        <div className="mt-4 rounded-[1.4rem] border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
          {contactError}
        </div>
      ) : null}

      {contactMessage ? (
        <div className="mt-4 rounded-[1.4rem] border border-[rgba(216,176,106,0.14)] bg-[rgba(216,176,106,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]">
          {contactMessage}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {/* Core Header (Always visible) */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Dati Anagrafici
            </p>
            <h3 className="text-lg font-bold text-white">
              {contactSnapshot.firstName} {contactSnapshot.lastName}
            </h3>
          </div>
          {!isEditingProfile && (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(216,176,106,0.25)] bg-[rgba(216,176,106,0.1)] text-[var(--accent-strong)] transition-all active:scale-90"
              onClick={() => {
                triggerHaptic();
                setIsDataExpanded(!isDataExpanded);
              }}
            >
              <span className="text-xl font-bold leading-none">
                {isDataExpanded ? "−" : "+"}
              </span>
            </button>
          )}
        </div>

        {isEditingProfile ? null : (
          <div className="grid gap-3">
            {/* Collapsible/Missing Content */}
            <div className="grid gap-3">
              {/* Contacts (Email/Phone) - Expanded only if full, or if one is missing */}
              <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Contatti
                </p>
                <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--text-muted)]">
                  <p>
                    Email:{" "}
                    <span className={contactSnapshot.email ? "text-white" : "text-[var(--danger)] font-semibold"}>
                      {contactSnapshot.email || "Non disponibile"}
                    </span>
                  </p>
                  <p>
                    Telefono:{" "}
                    <span className={contactSnapshot.phone ? "text-white" : "text-[var(--danger)] font-semibold"}>
                      {contactSnapshot.phone || "Non disponibile"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Birth Date - Expanded only if full, or if missing */}
              {(isDataExpanded || !contactSnapshot.birthDate) && (
                <div className="panel-muted rounded-[1.5rem] px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                    Data di nascita
                  </p>
                  <p className={contactSnapshot.birthDate ? "mt-2 text-base font-semibold text-white" : "mt-2 text-sm text-[var(--danger)] font-semibold"}>
                    {contactSnapshot.birthDate
                      ? formatBirthDateLabel(contactSnapshot.birthDate)
                      : "Non disponibile"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!activeCardCode || showActivatedCardPanel ? (
          <div className="mt-2">
            <FidelityActivationPanel
              contactCode={contactCode}
              activeCardCode={activeCardCode}
              qrLabel="QR ciurma Tortuga"
              onActivated={handleFidelityActivated}
            />
          </div>
        ) : null}
      </div>


      <div className="mt-5 flex flex-col gap-2 border-t border-[rgba(216,176,106,0.14)] pt-4 sm:flex-row">
        <button
          type="button"
          className="button-secondary inline-flex min-h-11 flex-1 items-center justify-center px-4 text-sm"
          onClick={() => {
            triggerHaptic();
            if (isEditingProfile) {
              setIsEditingProfile(false);
              setContactError("");
              setContactMessage("");
              return;
            }

            openContactEditor();
          }}
        >
          {isEditingProfile ? "Chiudi modifiche" : "Modifica dati"}
        </button>
        <button
          type="button"
          className="button-secondary inline-flex min-h-11 flex-1 items-center justify-center px-4 text-sm"
          onClick={() => {
            triggerHaptic();
            changeAccount();
          }}
        >
          Cambia profilo
        </button>
      </div>

    </div>
  );
}
