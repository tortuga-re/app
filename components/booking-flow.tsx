"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { TortugaMapViewer } from "@/components/tortuga-map-viewer";
import { storageKeys } from "@/lib/config";
import { requestJson } from "@/lib/client";
import type {
  BookingAvailabilityResponse,
  BookingBootstrapResponse,
  BookingCreateInput,
  BookingCreateResponse,
  BookingSlot,
  ProfileResponse,
  WaitlistCreateInput,
  WaitlistCreateResponse,
} from "@/lib/cooperto/types";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import {
  useHydratedLocalStorageState,
  writeLocalStorageValue,
} from "@/lib/local-storage-state";
import { triggerHaptic } from "@/lib/haptics";
import { cn, formatDateTime, formatLongDate, safeNumber, todayIso } from "@/lib/utils";

type BookingDraft = {
  date: string;
  pax: number;
  roomCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note: string;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
};

type DecoratedSlot = BookingSlot & {
  bandLabel: string;
  date: string;
};

const baseDraft: BookingDraft = {
  date: todayIso(),
  pax: 2,
  roomCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  note: "",
  privacyAccepted: true,
  marketingAccepted: true,
};

const SALA_CENTRALE_ROOM_CODE = "da1d57f0-e0d5-4d7e-86be-9f8300f388b8";

const buildDraftFallback = (
  firstName?: string,
  lastName?: string,
  email?: string,
  phone?: string,
  marketingConsent?: boolean,
): BookingDraft => ({
  ...baseDraft,
  firstName: firstName?.trim() ?? "",
  lastName: lastName?.trim() ?? "",
  email: normalizeCustomerEmail(email),
  phone: phone?.trim() ?? "",
  marketingAccepted: marketingConsent === true ? true : baseDraft.marketingAccepted,
});

const cleanText = (value?: string) => {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const isAfterDinnerBand = (label?: string, code?: string) => {
  const normalized = cleanText(`${label ?? ""} ${code ?? ""}`).toLowerCase();
  return normalized.includes("dopocena") || normalized.includes("dopo cena");
};

const getVisibleBands = (availability: BookingAvailabilityResponse | null) => {
  if (!availability) {
    return [];
  }

  return availability.days.map((day) => ({
    ...day,
    bands: day.bands.filter((band) => !isAfterDinnerBand(band.label, band.code)),
  }));
};

const getEnabledSlots = (
  availabilityDays: BookingAvailabilityResponse["days"],
): DecoratedSlot[] => {
  return availabilityDays.flatMap((day) =>
    day.bands.flatMap((band) =>
      band.slots
        .filter((slot) => slot.enabled)
        .map((slot) => ({
          ...slot,
          bandLabel: band.label,
          date: day.date,
        })),
    ),
  );
};

const parseStoredDraft = (
  raw: string,
  fallbackDraft: BookingDraft,
  marketingConsent?: boolean,
): BookingDraft | null => {
  const parsed = JSON.parse(raw) as Partial<BookingDraft>;

  return {
    date:
      typeof parsed.date === "string" && parsed.date
        ? parsed.date
        : fallbackDraft.date,
    pax: Math.max(1, safeNumber(parsed.pax, fallbackDraft.pax)),
    roomCode: typeof parsed.roomCode === "string" ? parsed.roomCode : "",
    firstName:
      typeof parsed.firstName === "string" && parsed.firstName.trim()
        ? parsed.firstName
        : fallbackDraft.firstName,
    lastName:
      typeof parsed.lastName === "string" && parsed.lastName.trim()
        ? parsed.lastName
        : fallbackDraft.lastName,
    email: (() => {
      if (typeof parsed.email !== "string") {
        return fallbackDraft.email;
      }

      const normalizedEmail = normalizeCustomerEmail(parsed.email);
      return normalizedEmail || fallbackDraft.email;
    })(),
    phone:
      typeof parsed.phone === "string" && parsed.phone.trim()
        ? parsed.phone
        : fallbackDraft.phone,
    note: typeof parsed.note === "string" ? parsed.note : "",
    privacyAccepted:
      typeof parsed.privacyAccepted === "boolean"
        ? parsed.privacyAccepted
        : fallbackDraft.privacyAccepted,
    marketingAccepted:
      marketingConsent === true
        ? true
        : typeof parsed.marketingAccepted === "boolean"
          ? parsed.marketingAccepted
          : fallbackDraft.marketingAccepted,
  };
};

export function BookingFlow() {
  const { identity, updateIdentity, setIdentityFromEmail } = useCustomerIdentity();
  const fallbackDraft = buildDraftFallback(
    identity.firstName,
    identity.lastName,
    identity.email,
    identity.phone,
    identity.marketingConsent,
  );
  const [draft, setDraft] = useHydratedLocalStorageState(
    storageKeys.bookingDraft,
    fallbackDraft,
    (raw) => parseStoredDraft(raw, fallbackDraft, identity.marketingConsent),
  );
  const [bootstrap, setBootstrap] = useState<BookingBootstrapResponse | null>(null);
  const [availability, setAvailability] =
    useState<BookingAvailabilityResponse | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedStatusCode, setSelectedStatusCode] = useState(1);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingWaitlist, setSubmittingWaitlist] = useState(false);
  const [error, setError] = useState("");
  const [waitlistError, setWaitlistError] = useState("");
  const [success, setSuccess] = useState<BookingCreateResponse | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] =
    useState<WaitlistCreateResponse | null>(null);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistContextKey, setWaitlistContextKey] = useState("");
  const customerDetailsStepRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledToCustomerStepRef = useRef(false);
  const pendingInitialSlotScrollRef = useRef(false);
  const seededCustomerEmailRef = useRef("");
  const marketingFirstUntickBlockedRef = useRef(false);

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const response = await requestJson<BookingBootstrapResponse>(
          "/api/booking/bootstrap",
        );
        setBootstrap(response);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Non siamo riusciti a caricare il modulo prenotazioni.",
        );
      } finally {
        setLoadingBootstrap(false);
      }
    };

    void loadBootstrap();
  }, []);

  const requiresRoomSelection = Boolean(
    bootstrap?.module?.allowsRoomSelection && bootstrap.rooms.length > 0,
  );
  const defaultActiveRoomCode =
    bootstrap?.rooms.find((room) => room.code === SALA_CENTRALE_ROOM_CODE)?.code ||
    bootstrap?.defaultRoomCode ||
    bootstrap?.rooms[0]?.code ||
    "";
  const activeRoomCode = draft.roomCode || defaultActiveRoomCode;
  const selectedRoom =
    bootstrap?.rooms.find((room) => room.code === activeRoomCode) ?? null;
  const composedCustomerNote = draft.note.trim() || undefined;
  const showRoomDropdown = requiresRoomSelection;
  const canLoadAvailability = Boolean(
    bootstrap &&
      draft.date &&
      draft.pax > 0 &&
      (!requiresRoomSelection || activeRoomCode),
  );
  const visibleDays = canLoadAvailability ? getVisibleBands(availability) : [];
  const enabledSlots = getEnabledSlots(visibleDays);
  const selectedSlot = canLoadAvailability
    ? enabledSlots.find((slot) => slot.time === selectedTime) ?? null
    : null;
  const availabilityKey = canLoadAvailability
    ? `${draft.date}|${draft.pax}|${activeRoomCode}`
    : "";
  const hasNoAvailableSlots = Boolean(
    canLoadAvailability &&
      availability &&
      !loadingAvailability &&
      enabledSlots.length === 0,
  );
  const isWaitlistContextActive = waitlistContextKey === availabilityKey;
  const visibleWaitlistSuccess =
    hasNoAvailableSlots && isWaitlistContextActive ? waitlistSuccess : null;
  const showVisibleWaitlistForm =
    hasNoAvailableSlots && isWaitlistContextActive && showWaitlistForm;
  const shouldHideMarketingConsent = identity.marketingConsent === true;

  useEffect(() => {
    if (!availabilityKey) {
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      setLoadingAvailability(true);
      setError("");
      setSuccess(null);

      const params = new URLSearchParams({
        date: draft.date,
        pax: String(draft.pax),
      });

      if (activeRoomCode) {
        params.set("roomCode", activeRoomCode);
      }

      try {
        const response = await requestJson<BookingAvailabilityResponse>(
          `/api/booking/availability?${params.toString()}`,
        );

        if (cancelled) {
          return;
        }

        setAvailability(response);
      } catch (availabilityError) {
        if (cancelled) {
          return;
        }

        setAvailability(null);
        setError(
          availabilityError instanceof Error
            ? availabilityError.message
            : "Orari non disponibili al momento.",
        );
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    };

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [availabilityKey, activeRoomCode, draft.date, draft.pax]);

  useEffect(() => {
    if (
      !selectedSlot ||
      !pendingInitialSlotScrollRef.current ||
      hasAutoScrolledToCustomerStepRef.current
    ) {
      return;
    }

    pendingInitialSlotScrollRef.current = false;
    hasAutoScrolledToCustomerStepRef.current = true;

    window.requestAnimationFrame(() => {
      if (customerDetailsStepRef.current) {
        customerDetailsStepRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }

      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [selectedSlot]);

  useEffect(() => {
    const normalizedIdentityEmail = normalizeCustomerEmail(identity.email);
    const needsCustomerPrefill =
      Boolean(normalizedIdentityEmail) &&
      (!identity.firstName ||
        !identity.lastName ||
        !identity.phone ||
        identity.marketingConsent === undefined);

    if (!normalizedIdentityEmail || !needsCustomerPrefill) {
      if (!normalizedIdentityEmail) {
        seededCustomerEmailRef.current = "";
      }
      return;
    }

    if (seededCustomerEmailRef.current === normalizedIdentityEmail) {
      return;
    }

    let cancelled = false;
    seededCustomerEmailRef.current = normalizedIdentityEmail;

    const hydrateCustomerData = async () => {
      try {
        const response = await requestJson<ProfileResponse>(
          `/api/profile?mode=email&query=${encodeURIComponent(normalizedIdentityEmail)}`,
        );

        if (cancelled || !response.contact) {
          return;
        }

        updateIdentity({
          email: response.contact.Email || normalizedIdentityEmail,
          firstName: response.contact.Nome,
          lastName: response.contact.Cognome,
          phone: response.contact.Telefono,
          marketingConsent:
            typeof response.contact.ConsensoMarketing === "number"
              ? response.contact.ConsensoMarketing === 1
              : undefined,
        });
      } catch {
        if (!cancelled) {
          seededCustomerEmailRef.current = "";
        }
      }
    };

    void hydrateCustomerData();

    return () => {
      cancelled = true;
    };
  }, [
    identity.email,
    identity.firstName,
    identity.lastName,
    identity.marketingConsent,
    identity.phone,
    updateIdentity,
  ]);

  const submitBooking = async () => {
    if (!selectedSlot) {
      setError("Scegli uno slot disponibile prima di confermare.");
      return;
    }

    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError("Inserisci nome e cognome del cliente.");
      return;
    }

    if (!draft.email.trim()) {
      setError("Inserisci l'email del cliente.");
      return;
    }

    if (!isValidCustomerEmail(draft.email)) {
      setError("Inserisci un indirizzo email valido.");
      return;
    }

    if (!draft.phone.trim()) {
      setError("Inserisci il telefono del cliente.");
      return;
    }

    if (!draft.privacyAccepted) {
      setError("Il consenso privacy e richiesto per inviare la prenotazione.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload: BookingCreateInput = {
      date: draft.date,
      time: selectedSlot.time,
      pax: draft.pax,
      roomCode: activeRoomCode || undefined,
      statusCode: selectedStatusCode,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      note: composedCustomerNote,
      privacyAccepted: draft.privacyAccepted,
      marketingAccepted: draft.marketingAccepted,
    };

    try {
      if (payload.email) {
        setIdentityFromEmail(payload.email, {
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
          marketingConsent: payload.marketingAccepted,
        });
      }

      const response = await requestJson<BookingCreateResponse>("/api/booking/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(response);
      updateIdentity({
        email: response.reservation.Email || payload.email,
        firstName: response.reservation.Nome || payload.firstName,
        lastName: response.reservation.Cognome || payload.lastName,
        phone: response.reservation.Telefono || payload.phone,
        marketingConsent: payload.marketingAccepted,
      });
      writeLocalStorageValue(
        storageKeys.lastReservation,
        response.reservation,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "La prenotazione non e stata completata.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openWaitlistForm = () => {
    setWaitlistContextKey(availabilityKey);
    setWaitlistError("");
    setWaitlistSuccess(null);
    setShowWaitlistForm(true);
  };

  const submitWaitlist = async () => {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setWaitlistError("Inserisci nome e cognome per entrare in lista d'attesa.");
      return;
    }

    if (!draft.phone.trim()) {
      setWaitlistError("Inserisci un numero di telefono valido.");
      return;
    }

    if (!draft.privacyAccepted) {
      setWaitlistError("Il consenso privacy e richiesto per la lista d'attesa.");
      return;
    }

    setSubmittingWaitlist(true);
    setWaitlistError("");

    const payload: WaitlistCreateInput = {
      date: draft.date,
      pax: draft.pax,
      roomCode: activeRoomCode || undefined,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim() || undefined,
      note: composedCustomerNote,
      privacyAccepted: draft.privacyAccepted,
      marketingAccepted: draft.marketingAccepted,
    };

    try {
      const response = await requestJson<WaitlistCreateResponse>(
        "/api/booking/waitlist",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      setWaitlistContextKey(availabilityKey);
      setWaitlistSuccess(response);
      setShowWaitlistForm(false);
    } catch (submitError) {
      setWaitlistError(
        submitError instanceof Error
          ? submitError.message
          : "La richiesta lista d'attesa non e stata completata.",
      );
    } finally {
      setSubmittingWaitlist(false);
    }
  };

  const handleMarketingConsentChange = (checked: boolean) => {
    if (draft.marketingAccepted && !checked && !marketingFirstUntickBlockedRef.current) {
      marketingFirstUntickBlockedRef.current = true;
      return;
    }

    setDraft((current) => ({
      ...current,
      marketingAccepted: checked,
    }));
  };

  const renderAvailabilityContent = (spacingClass = "mt-4") => (
    <>
      {loadingAvailability ? (
        <div className={spacingClass}>
          <StatusBlock
            variant="loading"
            title="Sto rileggendo la rotta"
            description="Gli orari si aggiornano da soli quando cambi data, persone o sala."
          />
        </div>
      ) : null}

      {!loadingAvailability && availability ? (
        <>
          {hasNoAvailableSlots ? (
            <div className={`${spacingClass} space-y-4`}>
              <StatusBlock
                variant="empty"
                title="Nessun orario disponibile per questa selezione."
                description={
                  availability.days[0]?.unavailableMessage ||
                  "Puoi lasciare i tuoi dati ed entrare in lista d'attesa per questa richiesta."
                }
                action={
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
                }
              />

              {showVisibleWaitlistForm ? (
                <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/4 p-4">
                  <div className="space-y-2">
                    <p className="eyebrow">Lista d&apos;attesa</p>
                    <p className="text-sm leading-6 text-[var(--text-muted)]">
                      Lascia i tuoi dati e la ciurma ti ricontattera&apos; se si
                      libera un tavolo per questa richiesta.
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
                        className="field"
                        value={draft.firstName}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-muted)]">
                      <span>Cognome</span>
                      <input
                        className="field"
                        value={draft.lastName}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-muted)]">
                      <span>Telefono</span>
                      <input
                        className="field"
                        type="tel"
                        placeholder="+39..."
                        value={draft.phone}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-muted)]">
                      <span>Email</span>
                      <input
                        className="field"
                        type="email"
                        value={draft.email}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
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
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            privacyAccepted: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        Accetto il trattamento privacy per inviare la richiesta in
                        lista d&apos;attesa.
                      </span>
                    </label>
                    {!shouldHideMarketingConsent ? (
                      <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          checked={draft.marketingAccepted}
                          onChange={(event) =>
                            handleMarketingConsentChange(event.target.checked)
                          }
                        />
                        <span>
                          Accetto comunicazioni marketing future di Tortuga.
                        </span>
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
                    {submittingWaitlist
                      ? "Invio la lista d'attesa..."
                      : "Conferma lista d'attesa"}
                  </button>
                </div>
              ) : null}

              {visibleWaitlistSuccess ? (
                <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/4 p-4">
                  <p className="eyebrow">Lista d&apos;attesa registrata</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
                    <p className="text-white">
                      La tua richiesta e&apos; stata inserita correttamente.
                    </p>
                    <p>
                      Qualora si dovessero liberare dei posti sarai contattato/a
                      per confermare la prenotazione.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className={`${spacingClass} space-y-4`}>
              {visibleDays.map((day) => (
                <div key={day.date} className="space-y-3">
                  <p className="text-sm font-semibold text-white">
                    {formatLongDate(day.date)}
                  </p>

                  {day.bands.map((band) => {
                    const availableSlots = band.slots.filter((slot) => slot.enabled);
                    const cleanedWarning = cleanText(band.warning);

                    if (availableSlots.length === 0) {
                      return null;
                    }

                    return (
                      <div key={band.code} className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm text-[var(--accent-strong)]">
                            {band.label}
                          </p>
                          {band.durationMinutes ? (
                            <p className="text-xs text-[var(--text-muted)]">
                              Tempo di permanenza: {band.durationMinutes} min
                            </p>
                          ) : null}
                        </div>

                        {cleanedWarning ? (
                          <p className="rounded-2xl border border-[var(--border)] bg-white/4 px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
                            {cleanedWarning}
                          </p>
                        ) : null}

                        <div className="grid grid-cols-4 gap-2">
                          {availableSlots.map((slot) => {
                            const isActive = selectedTime === slot.time;

                            return (
                              <button
                                key={`${band.code}-${slot.time}`}
                                type="button"
                                className={cn(
                                  "panel-muted flex min-h-[72px] w-full items-center justify-center rounded-[1.25rem] px-1.5 py-5 text-center transition",
                                  isActive &&
                                    "border border-[var(--border-strong)] bg-white/8",
                                )}
                                onClick={() => {
                                  if (!hasAutoScrolledToCustomerStepRef.current) {
                                    pendingInitialSlotScrollRef.current = true;
                                  }
                                  setSelectedTime(slot.time);
                                  setSelectedStatusCode(slot.statusCode);
                                }}
                              >
                                <p className="text-base font-semibold leading-none text-white">
                                  {slot.time}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </>
  );

  return (
    <section className="space-y-5">
      {loadingBootstrap ? (
        <StatusBlock
          variant="loading"
          title="Sto preparando il tuo approdo al Tortuga"
          description="Recupero il modulo prenotazioni e le sale attive per mostrarti solo la rotta giusta."
        />
      ) : null}

      {error ? (
        <StatusBlock
          variant="error"
          title="Qualcosa non torna"
          description={error}
        />
      ) : null}

      {bootstrap ? (
        <>
          <div className="panel rounded-[2rem] p-5">
            <div className="space-y-2">
              <p className="eyebrow">Data e Persone</p>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Scegli quando vuoi salpare e quanti sarete a bordo.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
              <label className="space-y-2 text-sm text-[var(--text-muted)]">
                <span>Data</span>
                <input
                  className="field min-w-0"
                  type="date"
                  min={baseDraft.date}
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </label>

              <label className="space-y-2 text-sm text-[var(--text-muted)]">
                <span>Numero persone</span>
                <input
                  className="field min-w-0"
                  type="number"
                  min={1}
                  max={16}
                  value={draft.pax}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      pax: Number(event.target.value) || 1,
                    }))
                  }
                />
              </label>
            </div>

            {showRoomDropdown ? (
              <label className="mt-4 block space-y-2 text-sm text-[var(--text-muted)]">
                <span>Sala</span>
                <select
                  className="field"
                  value={activeRoomCode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      roomCode: event.target.value,
                    }))
                  }
                >
                  {bootstrap.rooms.map((room) => (
                    <option key={room.code} value={room.code}>
                      {room.publicName || room.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {canLoadAvailability ? (
              <div className="mt-5 border-t border-[rgba(255,216,156,0.08)] pt-5">
                <div className="space-y-2">
                  <p className="eyebrow">Slot Cena</p>
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    Gli slot si aggiornano in base alla data, alle persone e
                    alla sala che hai scelto.
                  </p>
                </div>

                {renderAvailabilityContent("mt-5")}
              </div>
            ) : null}

            {requiresRoomSelection && !activeRoomCode ? (
              <div className="mt-5 border-t border-[rgba(255,216,156,0.08)] pt-5">
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  Scegli prima la sala dal menu per vedere gli orari disponibili e
                  orientarti meglio con la mappa del locale.
                </p>
              </div>
            ) : null}
          </div>

          {activeRoomCode && selectedRoom ? (
            <TortugaMapViewer
              roomCode={activeRoomCode}
              roomName={selectedRoom.publicName || selectedRoom.name}
            />
          ) : null}

          {selectedSlot ? (
            <div ref={customerDetailsStepRef} className="panel rounded-[2rem] p-5">
              <div className="space-y-2">
                <p className="eyebrow">Dati Cliente</p>
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  Ultimo passo: inserisci i tuoi dati e conferma la prenotazione.
                </p>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-[var(--border)] bg-white/4 px-4 py-3">
                <p className="text-sm font-semibold text-white">
                  Slot scelto: {selectedSlot.time}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {formatLongDate(selectedSlot.date)} - {selectedSlot.bandLabel}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--text-muted)]">
                  <span>Nome</span>
                  <input
                    className="field"
                    required
                    value={draft.firstName}
                    onChange={(event) => {
                      const nextFirstName = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        firstName: nextFirstName,
                      }));

                      if (draft.email && isValidCustomerEmail(draft.email)) {
                        updateIdentity({ firstName: nextFirstName });
                      }
                    }}
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--text-muted)]">
                  <span>Cognome</span>
                  <input
                    className="field"
                    required
                    value={draft.lastName}
                    onChange={(event) => {
                      const nextLastName = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        lastName: nextLastName,
                      }));

                      if (draft.email && isValidCustomerEmail(draft.email)) {
                        updateIdentity({ lastName: nextLastName });
                      }
                    }}
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--text-muted)]">
                  <span>Email</span>
                  <input
                    className="field"
                    type="email"
                    required
                    value={draft.email}
                    onChange={(event) => {
                      const nextEmail = normalizeCustomerEmail(event.target.value);

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
                </label>
                <label className="space-y-2 text-sm text-[var(--text-muted)]">
                  <span>Telefono</span>
                  <input
                    className="field"
                    type="tel"
                    required
                    placeholder="+39..."
                    value={draft.phone}
                    onChange={(event) => {
                      const nextPhone = event.target.value;

                      setDraft((current) => ({ ...current, phone: nextPhone }));

                      if (draft.email && isValidCustomerEmail(draft.email)) {
                        updateIdentity({ phone: nextPhone });
                      }
                    }}
                  />
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
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        privacyAccepted: event.target.checked,
                      }))
                    }
                  />
                  <span>Accetto il trattamento privacy per inviare la prenotazione.</span>
                </label>
                {!shouldHideMarketingConsent ? (
                  <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={draft.marketingAccepted}
                      onChange={(event) =>
                        handleMarketingConsentChange(event.target.checked)
                      }
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
                  void submitBooking();
                }}
                disabled={submitting}
              >
                {submitting ? "Creo la prenotazione..." : "Conferma prenotazione"}
              </button>
            </div>
          ) : null}

          {success ? (
            <div className="panel rounded-[2rem] p-5">
              <div className="space-y-2">
                <p className="eyebrow">Prenotazione registrata</p>
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  La tua richiesta e&apos; arrivata a destinazione.
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <h2 className="text-2xl font-semibold text-white">
                  {success.reservation.LabelStato || "Ci vediamo al Tortuga"}
                </h2>
                {success.reservation.DataPrenotazione ? (
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    Data e ora: {formatDateTime(success.reservation.DataPrenotazione)}
                  </p>
                ) : null}
              </div>
              <Link
                href="/ciurma"
                className="button-secondary mt-5 inline-flex min-h-11 items-center justify-center px-5"
              >
                Apri la tua ciurma
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
