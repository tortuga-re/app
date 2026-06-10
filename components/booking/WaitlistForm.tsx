"use client";

import type { BookingDraft, BookingFieldErrors, BookingFieldName } from "./types";
import { StatusBlock } from "@/components/status-block";
import { triggerHaptic } from "@/lib/haptics";

type WaitlistFormProps = {
  draft: BookingDraft;
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  fieldErrors: BookingFieldErrors;
  clearFieldErrors: (...fields: BookingFieldName[]) => void;
  firstNameFieldRef: React.RefObject<HTMLInputElement | null>;
  lastNameFieldRef: React.RefObject<HTMLInputElement | null>;
  phoneFieldRef: React.RefObject<HTMLInputElement | null>;
  emailFieldRef: React.RefObject<HTMLInputElement | null>;
  privacyAcceptedFieldRef: React.RefObject<HTMLParagraphElement | null>;
  shouldHideMarketingConsent: boolean;
  handleMarketingConsentChange: (checked: boolean) => void;
  handlePhoneBlur: () => void;
  submitWaitlist: () => Promise<void>;
  submittingWaitlist: boolean;
  waitlistError: string;
};

export function WaitlistForm({
  draft,
  setDraft,
  fieldErrors,
  clearFieldErrors,
  firstNameFieldRef,
  lastNameFieldRef,
  phoneFieldRef,
  emailFieldRef,
  privacyAcceptedFieldRef,
  shouldHideMarketingConsent,
  handleMarketingConsentChange,
  handlePhoneBlur,
  submitWaitlist,
  submittingWaitlist,
  waitlistError,
}: WaitlistFormProps) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/4 p-4">
      <div className="space-y-2">
        <p className="eyebrow">Lista d&apos;attesa</p>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Lascia i tuoi dati e la ciurma ti ricontattera&apos; se si libera un tavolo per questa
          richiesta.
        </p>
      </div>

      {waitlistError ? (
        <div className="mt-4">
          <StatusBlock
            variant="error"
            title="Richiesta non completa"
            description={waitlistError}
          />
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Nome</span>
          <input
            ref={firstNameFieldRef}
            className="field"
            value={draft.firstName}
            onChange={(event) => {
              clearFieldErrors("firstName");
              setDraft((current) => ({
                ...current,
                firstName: event.target.value,
              }));
            }}
          />
          {fieldErrors.firstName ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.firstName}</p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Cognome</span>
          <input
            ref={lastNameFieldRef}
            className="field"
            value={draft.lastName}
            onChange={(event) => {
              clearFieldErrors("lastName");
              setDraft((current) => ({
                ...current,
                lastName: event.target.value,
              }));
            }}
          />
          {fieldErrors.lastName ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.lastName}</p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Telefono</span>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-sm font-semibold text-[var(--accent-strong)]">
              +39
            </span>
            <input
              ref={phoneFieldRef}
              className="field pl-14"
              type="tel"
              value={draft.phone.replace(/^\+39/, "")}
              onChange={(event) => {
                clearFieldErrors("phone");
                setDraft((current) => ({
                  ...current,
                  phone: "+39" + event.target.value.replace(/\D/g, ""),
                }));
              }}
              onBlur={handlePhoneBlur}
            />
          </div>
          {fieldErrors.phone ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.phone}</p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Email</span>
          <input
            ref={emailFieldRef}
            className="field"
            type="email"
            value={draft.email}
            onChange={(event) => {
              clearFieldErrors("email");
              setDraft((current) => ({
                ...current,
                email: event.target.value,
              }));
            }}
          />
          {fieldErrors.email ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.email}</p>
          ) : null}
        </label>
      </div>

      <label className="mt-3 block space-y-2 text-sm text-[var(--text-muted)]">
        <span>Note facoltative</span>
        <textarea
          className="field min-h-28 resize-none"
          value={draft.note}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
        />
      </label>

      <div className="mt-4 space-y-3">
        <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={draft.privacyAccepted}
            onChange={(event) => {
              clearFieldErrors("privacyAccepted");
              setDraft((current) => ({
                ...current,
                privacyAccepted: event.target.checked,
              }));
            }}
          />
          <span>
            Accetto il trattamento privacy per inviare la richiesta in lista d&apos;attesa.
          </span>
        </label>
        {fieldErrors.privacyAccepted ? (
          <p ref={privacyAcceptedFieldRef} className="text-xs font-semibold text-red-400">
            {fieldErrors.privacyAccepted}
          </p>
        ) : null}
        {!shouldHideMarketingConsent ? (
          <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={draft.marketingAccepted}
              onChange={(event) => handleMarketingConsentChange(event.target.checked)}
            />
            <span>Accetto comunicazioni marketing future di Tortuga.</span>
          </label>
        ) : null}
      </div>

      <button
        type="button"
        className="button-primary mt-5 flex min-h-12 w-full items-center justify-center px-4"
        onClick={() => {
          triggerHaptic();
          void submitWaitlist();
        }}
        disabled={submittingWaitlist}
      >
        {submittingWaitlist ? "Invio la lista d'attesa..." : "Conferma lista d'attesa"}
      </button>
    </div>
  );
}
