"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { StatusBlock } from "@/components/status-block";
import { trackAppEvent } from "@/lib/analytics";
import { storageKeys } from "@/lib/config";
import { requestJson } from "@/lib/client";
import type {
  BookingAvailabilityResponse,
  BookingBootstrapResponse,
  BookingCreateInput,
  BookingCreateResponse,
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
import { scrollToFormField } from "@/lib/form-focus";
import { useHashScroll } from "@/lib/hash-scroll";
import { formatLongDate, getRomeWeekday, todayIso } from "@/lib/utils";
import {
  italianPhoneValidationError,
  normalizeItalianPhone,
  validateItalianPhone,
} from "@/lib/validation/phone";

import type { BookingFieldErrors, BookingFieldName, DecoratedSlot } from "./booking/types";
import { BookingSuccessView } from "./booking/BookingSuccessView";
import { BookingParamsSelector } from "./booking/BookingParamsSelector";
import { TimeSlotSelector } from "./booking/TimeSlotSelector";
import { CustomerDetailsForm } from "./booking/CustomerDetailsForm";
import { AREA_FAMILY_ROOM_CODE, SALA_CENTRALE_ROOM_CODE, buildDraftFallback, fallbackWaitlistSlots, formatReservationDateLabel, formatReservationTimeLabel, getVisibleBands, getVisibleSlots, parsePositiveInteger, parseStoredDraft, timeToMinutes } from "@/features/booking/utils";

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
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});

  const [customModuleCode, setCustomModuleCode] = useState("");
  const [isRoomSelectionDisabled, setIsRoomSelectionDisabled] = useState(false);

  const customerDetailsStepRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledToCustomerStepRef = useRef(false);
  const pendingInitialSlotScrollRef = useRef(false);
  const seededCustomerEmailRef = useRef("");
  const marketingFirstUntickBlockedRef = useRef(false);
  const trackedStartBookingRef = useRef(false);
  const dateFieldRef = useRef<HTMLInputElement | null>(null);
  const paxFieldRef = useRef<HTMLInputElement | null>(null);
  const selectedTimeFieldRef = useRef<HTMLDivElement | null>(null);
  const childrenCountFieldRef = useRef<HTMLInputElement | null>(null);
  const firstNameFieldRef = useRef<HTMLInputElement | null>(null);
  const lastNameFieldRef = useRef<HTMLInputElement | null>(null);
  const emailFieldRef = useRef<HTMLInputElement | null>(null);
  const phoneFieldRef = useRef<HTMLInputElement | null>(null);
  const privacyAcceptedFieldRef = useRef<HTMLParagraphElement | null>(null);
  const minimumBookingDate = todayIso();
  const paxCount = parsePositiveInteger(draft.pax);

  const clearFieldErrors = (...fields: BookingFieldName[]) => {
    setFieldErrors((current) => {
      let hasChanged = false;
      const next = { ...current };

      for (const field of fields) {
        if (next[field]) {
          delete next[field];
          hasChanged = true;
        }
      }

      return hasChanged ? next : current;
    });
  };

  const scrollToFirstBookingError = (errors: BookingFieldErrors) => {
    const fieldOrder: BookingFieldName[] = [
      "date",
      "pax",
      "selectedTime",
      "childrenCount",
      "firstName",
      "lastName",
      "email",
      "phone",
      "privacyAccepted",
    ];

    const firstInvalidField = fieldOrder.find((field) => errors[field]);
    if (firstInvalidField) {
      const fieldMap: Record<BookingFieldName, HTMLElement | null> = {
        date: dateFieldRef.current,
        pax: paxFieldRef.current,
        selectedTime: selectedTimeFieldRef.current,
        childrenCount: childrenCountFieldRef.current,
        firstName: firstNameFieldRef.current,
        lastName: lastNameFieldRef.current,
        email: emailFieldRef.current,
        phone: phoneFieldRef.current,
        privacyAccepted: privacyAcceptedFieldRef.current,
      };

      scrollToFormField(fieldMap[firstInvalidField]);
    }
  };

  const validateDraftFields = ({
    requireSelectedSlot,
    requireEmail,
  }: {
    requireSelectedSlot: boolean;
    requireEmail: boolean;
  }) => {
    const errors: BookingFieldErrors = {};

    if (!draft.date) {
      errors.date = "Seleziona una data.";
    } else if (draft.date < minimumBookingDate) {
      errors.date = "Non puoi selezionare una data precedente a oggi.";
    }

    if (!draft.pax.trim()) {
      errors.pax = "Inserisci il numero di persone.";
    } else if (!paxCount) {
      errors.pax = "Inserisci un numero di persone valido.";
    }

    if (requireSelectedSlot && !selectedSlot) {
      errors.selectedTime = "Scegli un orario disponibile prima di confermare.";
    }

    if (isAreaFamily) {
      const childrenCount = parsePositiveInteger(draft.childrenCount);

      if (!draft.childrenCount.trim()) {
        errors.childrenCount = "Inserisci il numero di bambini.";
      } else if (!childrenCount) {
        errors.childrenCount = "Inserisci un numero di bambini valido.";
      }
    }

    if (!draft.firstName.trim()) {
      errors.firstName = "Inserisci il nome.";
    }

    if (!draft.lastName.trim()) {
      errors.lastName = "Inserisci il cognome.";
    }

    if (requireEmail) {
      if (!draft.email.trim()) {
        errors.email = "Inserisci l'email del cliente.";
      } else if (!isValidCustomerEmail(draft.email)) {
        errors.email = "Inserisci un indirizzo email valido.";
      }
    } else if (draft.email.trim() && !isValidCustomerEmail(draft.email)) {
      errors.email = "Inserisci un indirizzo email valido.";
    }

    if (!draft.phone.trim()) {
      errors.phone = italianPhoneValidationError;
    } else {
      const normalizedPhone = validateItalianPhone(draft.phone);
      if (!normalizedPhone.ok) {
        errors.phone = normalizedPhone.error;
      }
    }

    if (!draft.privacyAccepted) {
      errors.privacyAccepted = "Devi accettare il consenso privacy per continuare.";
    }

    return errors;
  };

  const handlePhoneBlur = () => {
    if (!draft.phone.trim()) return;
    const normalized = normalizeItalianPhone(draft.phone);
    if (normalized) {
      const nextPhone = normalized.normalizedE164;
      setDraft((current) => ({ ...current, phone: nextPhone }));
      if (draft.email && isValidCustomerEmail(draft.email)) {
        updateIdentity({ phone: nextPhone });
      }
    }
  };

  useEffect(() => {
    if (trackedStartBookingRef.current) {
      return;
    }

    trackedStartBookingRef.current = true;
    trackAppEvent("start_booking", {
      app_section: "prenota",
      default_pax: paxCount,
      has_prefilled_email: Boolean(draft.email),
    });
  }, [draft.email, paxCount]);

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
  const isAreaFamily = activeRoomCode === AREA_FAMILY_ROOM_CODE;
  const selectedRoom =
    bootstrap?.rooms.find((room) => room.code === activeRoomCode) ?? null;
  const composedCustomerNote = [
    draft.isAfterDinner ? "INGRESSO DOPO CENA" : "",
    isAreaFamily && draft.childrenCount ? `Bambini: ${draft.childrenCount}` : "",
    draft.note.trim(),
  ]
    .filter(Boolean)
    .join("\n")
    .trim() || undefined;
  const showRoomDropdown = requiresRoomSelection && !isRoomSelectionDisabled;
  const canLoadAvailability = Boolean(
    bootstrap &&
      draft.date &&
      draft.date >= minimumBookingDate &&
      paxCount &&
      (!requiresRoomSelection || activeRoomCode),
  );
  const visibleDays = canLoadAvailability ? getVisibleBands(availability) : [];
  const visibleSlots = getVisibleSlots(visibleDays, draft.isAfterDinner);
  const enabledSlots = visibleSlots.filter((slot) => slot.enabled);
  const selectedSlot = canLoadAvailability
    ? enabledSlots.find((slot) => slot.time === selectedTime) ?? null
    : null;
  const selectedVisibleSlot = canLoadAvailability
    ? visibleSlots.find((slot) => slot.time === selectedTime) ?? null
    : null;
  const isSundaySelected = Boolean(
    draft.date && !Number.isNaN(Date.parse(`${draft.date}T12:00:00Z`)) && getRomeWeekday(`${draft.date}T12:00:00Z`) === 0,
  );
  const unavailableMessage = availability?.days[0]?.unavailableMessage || (availability && visibleSlots.length === 0 ? "Giorno di chiusura" : undefined);
  const displayedSlots = visibleSlots.length > 0
    ? visibleSlots
    : (!availability
        ? fallbackWaitlistSlots.map((time) => ({
            time,
            enabled: false,
            statusCode: 1,
            beyondMidnight: false,
            bandLabel: "",
            date: draft.date,
          } as DecoratedSlot))
        : []);
  const displayedSlotGroups = Array.from(
    displayedSlots.reduce((groups, slot) => {
      if (isSundaySelected) {
        const minutes = timeToMinutes(slot.time);
        if (minutes === null) {
          return groups;
        }

        if (minutes >= 900 && minutes <= 1140) {
          return groups;
        }

        const sundayLabel = minutes < 900 ? "PRANZO" : "CENA";
        const sundaySlots = groups.get(sundayLabel) ?? [];
        sundaySlots.push(slot);
        groups.set(sundayLabel, sundaySlots);
        return groups;
      }

      const groupLabel = slot.bandLabel || "ORARI";
      const groupSlots = groups.get(groupLabel) ?? [];
      groupSlots.push(slot);
      groups.set(groupLabel, groupSlots);
      return groups;
    }, new Map<string, DecoratedSlot[]>()),
  ).map(([groupLabel, groupSlots]) => ({
    groupLabel,
    slots: groupSlots,
  }));
  const selectedUnavailableSlot = canLoadAvailability
    ? selectedVisibleSlot && !selectedVisibleSlot.enabled
      ? selectedVisibleSlot
      : selectedTime && fallbackWaitlistSlots.includes(selectedTime) && !selectedSlot
        ? ({
            time: selectedTime,
            enabled: false,
            statusCode: selectedStatusCode,
            beyondMidnight: false,
            bandLabel: "",
            date: draft.date,
          } as DecoratedSlot)
        : null
    : null;
  const successDateLabel = success?.reservation.DataPrenotazione
    ? formatReservationDateLabel(success.reservation.DataPrenotazione)
    : selectedSlot
      ? formatLongDate(selectedSlot.date)
      : "-";
  const successTimeLabel =
    formatReservationTimeLabel(success?.reservation.DataPrenotazione) ||
    selectedSlot?.time ||
    "-";
  const availabilityKey = canLoadAvailability
    ? `${draft.date}|${paxCount}|${activeRoomCode}|${customModuleCode}|${isRoomSelectionDisabled}`
    : "";
  const hasNoAvailableSlots = Boolean(
    canLoadAvailability &&
      availability &&
      !loadingAvailability &&
      visibleSlots.length > 0 &&
      enabledSlots.length === 0,
  );
  const hasWaitlistContext =
    hasNoAvailableSlots || Boolean(selectedUnavailableSlot);
  const isWaitlistContextActive = waitlistContextKey === availabilityKey;
  const visibleWaitlistSuccess =
    hasNoAvailableSlots && isWaitlistContextActive ? waitlistSuccess : null;
  const showVisibleWaitlistForm =
    hasWaitlistContext && isWaitlistContextActive && showWaitlistForm;
  const shouldHideMarketingConsent = identity.marketingConsent === true;
  useHashScroll(
    `${loadingBootstrap}:${availabilityKey}:${Boolean(selectedSlot)}:${Boolean(success)}:${showVisibleWaitlistForm}:${Boolean(error)}:${Boolean(waitlistError)}`,
  );

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
        pax: String(paxCount),
      });

      if (activeRoomCode && !isRoomSelectionDisabled) {
        params.set("roomCode", activeRoomCode);
      }

      if (customModuleCode) {
        params.set("moduleCode", customModuleCode);
      }

      try {
        const response = await requestJson<BookingAvailabilityResponse>(
          `/api/booking/availability?${params.toString()}`,
        );

        if (cancelled) {
          return;
        }

        setAvailability(response);

        if (response.days[0]?.redirectOnEvent && response.days[0]?.redirectUrl) {
          const redirectUrl = response.days[0].redirectUrl;
          const match = redirectUrl.match(/\/in\/([a-zA-Z0-9-]+)/);
          if (match && match[1] && customModuleCode !== match[1]) {
            setCustomModuleCode(match[1]);
          }
        }
      } catch (availabilityError) {
        if (cancelled) {
          return;
        }

        const msg = availabilityError instanceof Error ? availabilityError.message : String(availabilityError);
        if (msg.includes("SALA_NON_SELEZIONABILE_MODULO")) {
          setIsRoomSelectionDisabled(true);
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
  }, [availabilityKey, activeRoomCode, draft.date, paxCount, customModuleCode, isRoomSelectionDisabled]);

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
    const errors = validateDraftFields({
      requireSelectedSlot: true,
      requireEmail: true,
    });

    if (Object.keys(errors).length > 0 || !paxCount) {
      setFieldErrors(errors);
      setError("");
      scrollToFirstBookingError(errors);
      return;
    }

    if (!selectedSlot) {
      return;
    }

    const confirmedPax = paxCount;

    const normalizedPhone = validateItalianPhone(draft.phone);
    if (!normalizedPhone.ok) {
      const errors = { phone: normalizedPhone.error } satisfies BookingFieldErrors;
      setFieldErrors(errors);
      scrollToFirstBookingError(errors);
      return;
    }

    setSubmitting(true);
    setError("");
    setFieldErrors({});

    const payload: BookingCreateInput = {
      date: draft.date,
      time: selectedSlot.time,
      pax: confirmedPax,
      roomCode: isRoomSelectionDisabled ? undefined : (activeRoomCode || undefined),
      statusCode: selectedStatusCode,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim() || undefined,
      phone: normalizedPhone.normalizedE164,
      note: composedCustomerNote,
      privacyAccepted: draft.privacyAccepted,
      marketingAccepted: draft.marketingAccepted,
      moduleCode: customModuleCode || undefined,
    };

    trackAppEvent("booking_request_submit", {
      app_section: "prenota",
      booking_date: payload.date,
      booking_pax: payload.pax,
      booking_room_selected: Boolean(payload.roomCode),
      marketing_accepted: payload.marketingAccepted,
      privacy_accepted: payload.privacyAccepted,
      source: "booking_flow",
    });

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
      window.location.hash = "#prenotazione-completata";
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "La prenotazione non e stata completata.",
      );
      window.location.hash = "#booking-form";
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
    const errors = validateDraftFields({
      requireSelectedSlot: false,
      requireEmail: false,
    });

    if (Object.keys(errors).length > 0 || !paxCount) {
      setFieldErrors(errors);
      setWaitlistError("");
      scrollToFirstBookingError(errors);
      return;
    }

    const confirmedPax = paxCount;

    const normalizedPhone = validateItalianPhone(draft.phone);
    if (!normalizedPhone.ok) {
      const errors = { phone: normalizedPhone.error } satisfies BookingFieldErrors;
      setFieldErrors(errors);
      scrollToFirstBookingError(errors);
      return;
    }

    setSubmittingWaitlist(true);
    setWaitlistError("");
    setFieldErrors({});

    const payload: WaitlistCreateInput = {
      date: draft.date,
      requestedTime: draft.isAfterDinner
        ? "Dopo cena"
        : selectedTime || undefined,
      pax: confirmedPax,
      roomCode: isRoomSelectionDisabled ? undefined : (activeRoomCode || undefined),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: normalizedPhone.normalizedE164,
      email: draft.email.trim() || undefined,
      note: composedCustomerNote,
      privacyAccepted: draft.privacyAccepted,
      marketingAccepted: draft.marketingAccepted,
      moduleCode: customModuleCode || undefined,
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
      window.location.hash = "#waitlist-success";
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

  const handleSelectSlot = (time: string, statusCode: number) => {
    if (time) {
      if (!hasAutoScrolledToCustomerStepRef.current) {
        pendingInitialSlotScrollRef.current = true;
      }
      clearFieldErrors("selectedTime");
      setSelectedTime(time);
      setSelectedStatusCode(statusCode);
      window.location.hash = "#dati-cliente";
    } else {
      setSelectedTime("");
    }
  };

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
          {success ? (
            <BookingSuccessView
              success={success}
              successDateLabel={successDateLabel}
              successTimeLabel={successTimeLabel}
              onReset={() => {
                setSuccess(null);
                setSelectedTime("");
                setFieldErrors({});
                setDraft(fallbackDraft);
              }}
            />
          ) : (
            <>
              <BookingParamsSelector
                draft={draft}
                setDraft={setDraft}
                fieldErrors={fieldErrors}
                clearFieldErrors={clearFieldErrors}
                dateFieldRef={dateFieldRef}
                paxFieldRef={paxFieldRef}
                minimumBookingDate={minimumBookingDate}
                bootstrap={bootstrap}
                showRoomDropdown={showRoomDropdown}
                activeRoomCode={activeRoomCode}
                setSelectedTime={setSelectedTime}
                setCustomModuleCode={setCustomModuleCode}
                setIsRoomSelectionDisabled={setIsRoomSelectionDisabled}
                AREA_FAMILY_ROOM_CODE={AREA_FAMILY_ROOM_CODE}
              />

              {requiresRoomSelection && !activeRoomCode && !isRoomSelectionDisabled ? (
                <div className="mt-5 border-t border-[rgba(255,216,156,0.08)] pt-5">
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    Scegli prima la sala richiesta per vedere gli orari disponibili.
                  </p>
                </div>
              ) : null}

              {canLoadAvailability ? (
                <TimeSlotSelector
                  draft={draft}
                  setDraft={setDraft}
                  fieldErrors={fieldErrors}
                  clearFieldErrors={clearFieldErrors}
                  loadingAvailability={loadingAvailability}
                  availability={availability}
                  unavailableMessage={unavailableMessage}
                  displayedSlotGroups={displayedSlotGroups}
                  selectedTime={selectedTime}
                  onSelectSlot={handleSelectSlot}
                  isSundaySelected={isSundaySelected}
                  hasWaitlistContext={hasWaitlistContext}
                  openWaitlistForm={openWaitlistForm}
                  showVisibleWaitlistForm={showVisibleWaitlistForm}
                  submitWaitlist={submitWaitlist}
                  submittingWaitlist={submittingWaitlist}
                  waitlistError={waitlistError}
                  visibleWaitlistSuccess={!!visibleWaitlistSuccess}
                  isAreaFamily={isAreaFamily}
                  childrenCountFieldRef={childrenCountFieldRef}
                  selectedTimeFieldRef={selectedTimeFieldRef}
                  firstNameFieldRef={firstNameFieldRef}
                  lastNameFieldRef={lastNameFieldRef}
                  phoneFieldRef={phoneFieldRef}
                  emailFieldRef={emailFieldRef}
                  privacyAcceptedFieldRef={privacyAcceptedFieldRef}
                  shouldHideMarketingConsent={shouldHideMarketingConsent}
                  handleMarketingConsentChange={handleMarketingConsentChange}
                  handlePhoneBlur={handlePhoneBlur}
                />
              ) : null}

              {selectedSlot ? (
                <CustomerDetailsForm
                  draft={draft}
                  setDraft={setDraft}
                  fieldErrors={fieldErrors}
                  clearFieldErrors={clearFieldErrors}
                  selectedSlot={selectedSlot}
                  selectedRoom={selectedRoom}
                  paxCount={paxCount}
                  firstNameFieldRef={firstNameFieldRef}
                  lastNameFieldRef={lastNameFieldRef}
                  emailFieldRef={emailFieldRef}
                  phoneFieldRef={phoneFieldRef}
                  privacyAcceptedFieldRef={privacyAcceptedFieldRef}
                  shouldHideMarketingConsent={shouldHideMarketingConsent}
                  handleMarketingConsentChange={handleMarketingConsentChange}
                  handlePhoneBlur={handlePhoneBlur}
                  updateIdentity={updateIdentity}
                  setIdentityFromEmail={setIdentityFromEmail}
                  identity={identity}
                  submitBooking={submitBooking}
                  submitting={submitting}
                  customerDetailsStepRef={customerDetailsStepRef}
                />
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
