"use client";

import type { BookingDraft, BookingFieldErrors, BookingFieldName } from "./types";
import type { BookingBootstrapResponse } from "@/lib/cooperto/types";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

type BookingParamsSelectorProps = {
  draft: BookingDraft;
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  fieldErrors: BookingFieldErrors;
  clearFieldErrors: (...fields: BookingFieldName[]) => void;
  dateFieldRef: React.RefObject<HTMLInputElement | null>;
  paxFieldRef: React.RefObject<HTMLInputElement | null>;
  minimumBookingDate: string;
  bootstrap: BookingBootstrapResponse | null;
  showRoomDropdown: boolean;
  activeRoomCode: string;
  setSelectedTime: (val: string) => void;
  setCustomModuleCode: (val: string) => void;
  setIsRoomSelectionDisabled: (val: boolean) => void;
  AREA_FAMILY_ROOM_CODE: string;
};

export function BookingParamsSelector({
  draft,
  setDraft,
  fieldErrors,
  clearFieldErrors,
  dateFieldRef,
  paxFieldRef,
  minimumBookingDate,
  bootstrap,
  showRoomDropdown,
  activeRoomCode,
  setSelectedTime,
  setCustomModuleCode,
  setIsRoomSelectionDisabled,
  AREA_FAMILY_ROOM_CODE,
}: BookingParamsSelectorProps) {
  return (
    <div id="booking-form" className="panel hash-scroll-target rounded-[2rem] p-5">
      <div className="space-y-2">
        <p className="eyebrow">Rotta e Ciurma</p>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Scegli quando vuoi salpare e quanti sarete a bordo.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Giorno del viaggio</span>
          <input
            ref={dateFieldRef}
            className="field min-w-0"
            type="date"
            min={minimumBookingDate}
            value={draft.date}
            onChange={(event) => {
              clearFieldErrors("date", "selectedTime");
              setDraft((current) => ({ ...current, date: event.target.value }));
              setCustomModuleCode("");
              setIsRoomSelectionDisabled(false);
            }}
          />
          {fieldErrors.date ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.date}</p>
          ) : null}
        </label>

        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Quanti pirati?</span>
          <input
            ref={paxFieldRef}
            className="field min-w-0"
            type="number"
            min={1}
            value={draft.pax}
            onChange={(event) => {
              clearFieldErrors("pax", "selectedTime");
              setDraft((current) => ({
                ...current,
                pax: event.target.value,
              }));
            }}
          />
          {fieldErrors.pax ? (
            <p className="text-xs font-semibold text-red-400">{fieldErrors.pax}</p>
          ) : null}
        </label>
      </div>

      {showRoomDropdown && bootstrap ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-[var(--text-muted)]">Scegli la Sala</p>
          <div className="grid grid-cols-2 gap-2">
            {bootstrap.rooms.map((room) => {
              const isSelected = activeRoomCode === room.code;
              const roomLabel =
                (room.publicName || room.name).trim().toUpperCase() === "CABINA DI POPPA"
                  ? "GALEONE"
                  : room.publicName || room.name;

              return (
                <button
                  key={room.code}
                  type="button"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-[1.25rem] border p-5 transition-all active:scale-95 min-h-[80px]",
                    isSelected
                      ? "active-tab-glow border-[var(--accent-strong)] bg-[var(--accent-soft)] text-white"
                      : "border-[rgba(255,216,156,0.1)] bg-white/4 text-[var(--text-muted)] hover:border-[rgba(255,216,156,0.3)]",
                  )}
                  onClick={() => {
                    triggerHaptic();
                    clearFieldErrors("childrenCount", "selectedTime");
                    setDraft((current) => ({
                      ...current,
                      roomCode: room.code,
                      childrenCount:
                        room.code === AREA_FAMILY_ROOM_CODE ? current.childrenCount : "",
                    }));
                    setSelectedTime("");

                    // Scroll manuale agli orari disponibili dopo un breve delay per il re-render
                    setTimeout(() => {
                      const el = document.getElementById("availability-section");
                      if (el) {
                        const offset = 100; // Offset per non incollare l'elemento al top
                        const bodyRect = document.body.getBoundingClientRect().top;
                        const elementRect = el.getBoundingClientRect().top;
                        const elementPosition = elementRect - bodyRect;
                        const offsetPosition = elementPosition - offset;

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: "smooth",
                        });
                      }
                    }, 100);
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-center">
                    {roomLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

    </div>
  );
}
