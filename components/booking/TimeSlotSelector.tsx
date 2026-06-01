"use client";

import type { BookingDraft, BookingFieldErrors, BookingFieldName, DecoratedSlot } from "./types";
import type { BookingAvailabilityResponse } from "@/lib/cooperto/types";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { StatusBlock } from "@/components/status-block";
import { WaitlistForm } from "./WaitlistForm";

type TimeSlotSelectorProps = {
  draft: BookingDraft;
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  fieldErrors: BookingFieldErrors;
  clearFieldErrors: (...fields: BookingFieldName[]) => void;
  loadingAvailability: boolean;
  availability: BookingAvailabilityResponse | null;
  unavailableMessage: string | undefined;
  displayedSlotGroups: { groupLabel: string; slots: DecoratedSlot[] }[];
  selectedTime: string;
  onSelectSlot: (time: string, statusCode: number) => void;
  isSundaySelected: boolean;
  hasWaitlistContext: boolean;
  openWaitlistForm: () => void;
  showVisibleWaitlistForm: boolean;
  submitWaitlist: () => Promise<void>;
  submittingWaitlist: boolean;
  waitlistError: string;
  visibleWaitlistSuccess: boolean;
  isAreaFamily: boolean;
  childrenCountFieldRef: React.RefObject<HTMLInputElement | null>;
  selectedTimeFieldRef: React.RefObject<HTMLDivElement | null>;
  firstNameFieldRef: React.RefObject<HTMLInputElement | null>;
  lastNameFieldRef: React.RefObject<HTMLInputElement | null>;
  phoneFieldRef: React.RefObject<HTMLInputElement | null>;
  emailFieldRef: React.RefObject<HTMLInputElement | null>;
  privacyAcceptedFieldRef: React.RefObject<HTMLParagraphElement | null>;
  shouldHideMarketingConsent: boolean;
  handleMarketingConsentChange: (checked: boolean) => void;
  handlePhoneBlur: () => void;
};

export function TimeSlotSelector({
  draft,
  setDraft,
  fieldErrors,
  clearFieldErrors,
  loadingAvailability,
  availability,
  unavailableMessage,
  displayedSlotGroups,
  selectedTime,
  onSelectSlot,
  isSundaySelected,
  hasWaitlistContext,
  openWaitlistForm,
  showVisibleWaitlistForm,
  submitWaitlist,
  submittingWaitlist,
  waitlistError,
  visibleWaitlistSuccess,
  isAreaFamily,
  childrenCountFieldRef,
  selectedTimeFieldRef,
  firstNameFieldRef,
  lastNameFieldRef,
  phoneFieldRef,
  emailFieldRef,
  privacyAcceptedFieldRef,
  shouldHideMarketingConsent,
  handleMarketingConsentChange,
  handlePhoneBlur,
}: TimeSlotSelectorProps) {
  const renderAvailabilityContent = () => (
    <>
      {loadingAvailability ? (
        <div className="mt-5">
          <StatusBlock
            variant="loading"
            title="Sto rileggendo la rotta"
            description="Gli orari si aggiornano da soli quando cambi data, persone o sala."
          />
        </div>
      ) : null}

      {!loadingAvailability && availability ? (
        <>
          {unavailableMessage ? (
            <div className="mt-5">
              <StatusBlock
                variant="info"
                title="Giorno di chiusura"
                description={unavailableMessage}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="space-y-3">
                {displayedSlotGroups.map((group) => (
                  <div key={group.groupLabel} className="space-y-2">
                    {isSundaySelected ? (
                      <p className="eyebrow text-[0.72rem] text-[var(--text-muted)]">
                        {group.groupLabel}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-4 gap-2">
                      {group.slots.map((slot) => {
                        const time = slot.time;
                        const isActive = selectedTime === time;
                        const isUnavailable = !slot || !slot.enabled;

                        return (
                          <button
                            key={time}
                            type="button"
                            className={cn(
                              "panel-muted flex flex-col min-h-[72px] w-full items-center justify-center rounded-[1.25rem] px-1.5 py-4 text-center transition",
                              isActive && "border border-[var(--border-strong)] bg-white/8",
                              isUnavailable &&
                                "border-[rgba(255,216,156,0.12)] bg-white/[0.03] text-[var(--text-muted)]",
                            )}
                            onClick={() => {
                              onSelectSlot(time, slot?.statusCode ?? 1);
                            }}
                          >
                            <p
                              className={cn(
                                "text-base font-semibold leading-none",
                                isUnavailable ? "text-[var(--text-muted)]" : "text-white",
                              )}
                            >
                              {time}
                            </p>
                            {isUnavailable ? (
                              <span className="mt-1 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                                Lista d&apos;attesa
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {hasWaitlistContext ? (
                  <div className="rounded-[1.5rem] border border-[rgba(255,216,156,0.38)] bg-[rgba(255,216,156,0.08)] px-4 py-4">
                    <p className="text-base leading-7 text-white">
                      Purtroppo per questa ora non ci sono posti disponibili, prova un altro orario
                      o <strong>ENTRA IN LISTA D&apos;ATTESA</strong>.
                    </p>
                  </div>
                ) : null}
              </div>

              {hasWaitlistContext ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    className="button-secondary inline-flex min-h-11 items-center justify-center px-5"
                    onClick={() => {
                      triggerHaptic();
                      openWaitlistForm();
                    }}
                  >
                    Entra in lista d&apos;attesa
                  </button>
                </div>
              ) : null}

              {showVisibleWaitlistForm ? (
                <WaitlistForm
                  draft={draft}
                  setDraft={setDraft}
                  fieldErrors={fieldErrors}
                  clearFieldErrors={clearFieldErrors}
                  firstNameFieldRef={firstNameFieldRef}
                  lastNameFieldRef={lastNameFieldRef}
                  phoneFieldRef={phoneFieldRef}
                  emailFieldRef={emailFieldRef}
                  privacyAcceptedFieldRef={privacyAcceptedFieldRef}
                  shouldHideMarketingConsent={shouldHideMarketingConsent}
                  handleMarketingConsentChange={handleMarketingConsentChange}
                  handlePhoneBlur={handlePhoneBlur}
                  submitWaitlist={submitWaitlist}
                  submittingWaitlist={submittingWaitlist}
                  waitlistError={waitlistError}
                />
              ) : null}

              {visibleWaitlistSuccess ? (
                <div
                  id="waitlist-success"
                  className="rounded-[1.5rem] border border-[var(--border)] bg-white/4 p-4"
                >
                  <p className="eyebrow">Lista d&apos;attesa registrata</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
                    <p className="text-white font-semibold">
                      La tua richiesta e&apos; stata inserita correttamente.
                    </p>
                    <p>
                      Qualora si dovessero liberare dei posti sarai contattato/a per confermare la
                      prenotazione.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </>
  );

  return (
    <div className="mt-5 border-t border-[rgba(255,216,156,0.08)] pt-5">
      <div className="space-y-3">
        <label className="flex items-center gap-3 text-sm text-white">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-[var(--border)] bg-white/4"
            checked={draft.isAfterDinner}
            onChange={(event) => {
              triggerHaptic();
              setDraft((current) => ({
                ...current,
                isAfterDinner: event.target.checked,
              }));
              onSelectSlot("", 1); // Deseleziona l'orario
            }}
          />
          <span className="font-semibold uppercase tracking-wider">Ingresso Dopo Cena</span>
        </label>

        {isAreaFamily ? (
          <label className="block space-y-2 text-sm text-[var(--text-muted)]">
            <span>Numero di bambini (obbligatorio)</span>
            <input
              ref={childrenCountFieldRef}
              className="field"
              type="number"
              min={1}
              required
              placeholder="Es: 2"
              value={draft.childrenCount}
              onChange={(event) => {
                clearFieldErrors("childrenCount");
                setDraft((current) => ({
                  ...current,
                  childrenCount: event.target.value,
                }));
              }}
            />
            {fieldErrors.childrenCount ? (
              <p className="text-xs font-semibold text-red-400">{fieldErrors.childrenCount}</p>
            ) : null}
          </label>
        ) : null}
      </div>

      <div id="availability-section" ref={selectedTimeFieldRef}>
        {renderAvailabilityContent()}
        {fieldErrors.selectedTime ? (
          <p className="mt-3 text-xs font-semibold text-red-400">{fieldErrors.selectedTime}</p>
        ) : null}
      </div>
    </div>
  );
}
