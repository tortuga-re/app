"use client";

import type { BookingDraft, BookingFieldErrors, BookingFieldName, DecoratedSlot } from "./types";
import { isValidCustomerEmail } from "@/lib/customer-identity";
import { triggerHaptic } from "@/lib/haptics";
import { formatInRome } from "@/lib/utils";

type CustomerDetailsFormProps = {
  draft: BookingDraft;
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  fieldErrors: BookingFieldErrors;
  clearFieldErrors: (...fields: BookingFieldName[]) => void;
  selectedSlot: DecoratedSlot;
  selectedRoom: { code: string; name: string; publicName?: string } | null;
  paxCount: number | null;
  firstNameFieldRef: React.RefObject<HTMLInputElement | null>;
  lastNameFieldRef: React.RefObject<HTMLInputElement | null>;
  emailFieldRef: React.RefObject<HTMLInputElement | null>;
  phoneFieldRef: React.RefObject<HTMLInputElement | null>;
  privacyAcceptedFieldRef: React.RefObject<HTMLParagraphElement | null>;
  shouldHideMarketingConsent: boolean;
  handleMarketingConsentChange: (checked: boolean) => void;
  handlePhoneBlur: () => void;
  updateIdentity: (next: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }) => void;
  setIdentityFromEmail: (
    email: string,
    prefill: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      marketingConsent?: boolean;
    },
  ) => void;
  identity: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    marketingConsent?: boolean;
  };
  submitBooking: () => Promise<void>;
  submitting: boolean;
  customerDetailsStepRef: React.RefObject<HTMLDivElement | null>;
};

export function CustomerDetailsForm({
  draft,
  setDraft,
  fieldErrors,
  clearFieldErrors,
  selectedSlot,
  selectedRoom,
  paxCount,
  firstNameFieldRef,
  lastNameFieldRef,
  emailFieldRef,
  phoneFieldRef,
  privacyAcceptedFieldRef,
  shouldHideMarketingConsent,
  handleMarketingConsentChange,
  handlePhoneBlur,
  updateIdentity,
  setIdentityFromEmail,
  identity,
  submitBooking,
  submitting,
  customerDetailsStepRef,
}: CustomerDetailsFormProps) {
  return (
    <div
      id="dati-cliente"
      ref={customerDetailsStepRef}
      className="panel hash-scroll-target rounded-[2rem] p-5"
    >
      <div className="space-y-2">
        <p className="eyebrow">Libro degli Ospiti</p>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Ultimo passo: inserisci i tuoi dati e conferma la prenotazione.
        </p>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-[var(--border)] bg-white/4 px-4 py-3">
        <p className="text-sm leading-6 text-white">
          Prenotazione per{" "}
          <span className="font-semibold">
            {formatInRome(selectedSlot.date, { weekday: "long" })}
            ,{" "}
            {formatInRome(selectedSlot.date, { day: "2-digit", month: "2-digit" })}
          </span>
          , alle ore <span className="font-semibold">{selectedSlot.time}</span> per{" "}
          <span className="font-semibold">
            {paxCount} {paxCount === 1 ? "persona" : "persone"}
          </span>{" "}
          , <span className="font-medium text-[var(--text-muted)]">Sala richiesta:</span>{" "}
          <span className="font-semibold text-[var(--accent-strong)]">
            {selectedRoom?.publicName || selectedRoom?.name || "Sala"}
          </span>
          .
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Nome</span>
          <input
            ref={firstNameFieldRef}
            className="field"
            required
            value={draft.firstName}
            onChange={(event) => {
              const nextFirstName = event.target.value;
              clearFieldErrors("firstName");
              setDraft((current) => ({
                ...current,
                firstName: nextFirstName,
              }));

              if (draft.email && isValidCustomerEmail(draft.email)) {
                updateIdentity({ firstName: nextFirstName });
              }
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
            required
            value={draft.lastName}
            onChange={(event) => {
              const nextLastName = event.target.value;
              clearFieldErrors("lastName");
              setDraft((current) => ({
                ...current,
                lastName: nextLastName,
              }));

              if (draft.email && isValidCustomerEmail(draft.email)) {
                updateIdentity({ lastName: nextLastName });
              }
            }}
          />
          {fieldErrors.lastName ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.lastName}</p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Email</span>
          <input
            ref={emailFieldRef}
            className="field"
            type="email"
            required
            value={draft.email}
            onChange={(event) => {
              const nextEmail = event.target.value;
              clearFieldErrors("email");

              setDraft((current) => ({ ...current, email: nextEmail }));

              if (isValidCustomerEmail(nextEmail)) {
                setIdentityFromEmail(nextEmail, {
                  firstName: draft.firstName,
                  lastName: draft.lastName,
                  phone: draft.phone,
                  marketingConsent: identity.marketingConsent,
                });
              }
            }}
          />
          {fieldErrors.email ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.email}</p>
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
              required
              value={draft.phone.replace(/^\+39/, "")}
              onChange={(event) => {
                const nextPhone = "+39" + event.target.value.replace(/\D/g, "");
                clearFieldErrors("phone");

                setDraft((current) => ({ ...current, phone: nextPhone }));

                if (draft.email && isValidCustomerEmail(draft.email)) {
                  updateIdentity({ phone: nextPhone });
                }
              }}
              onBlur={handlePhoneBlur}
            />
          </div>
          {fieldErrors.phone ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.phone}</p>
          ) : null}
        </label>
      </div>

      <label className="mt-3 block space-y-2 text-sm text-[var(--text-muted)]">
        <span>Note</span>
        <textarea
          className="field min-h-28 resize-none"
          value={draft.note}
          onChange={(event) =>
            setDraft((current) => ({ ...current, note: event.target.value }))
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
          <span>Accetto il trattamento privacy per inviare la prenotazione.</span>
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

      <div id="conferma" className="hash-scroll-target">
        <button
          type="button"
          className="button-primary cta-glow mt-5 flex min-h-12 w-full items-center justify-center px-4"
          onClick={() => {
            triggerHaptic();
            void submitBooking();
          }}
          disabled={submitting}
        >
          {submitting ? "Creo la prenotazione..." : "Conferma prenotazione"}
        </button>
      </div>
    </div>
  );
}
