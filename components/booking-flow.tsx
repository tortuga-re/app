"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { StatusBlock } from "@/components/status-block";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TortugaMapViewer = dynamic<any>(
  () =>
    import("@/components/tortuga-map-viewer")
      .then((mod) => mod.TortugaMapViewer)
      .catch(() => {
        if (typeof window !== "undefined") window.location.reload();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { default: () => null } as any;
      }),
  {
    loading: () => <div className="h-48 w-full animate-pulse rounded-[2rem] bg-white/5" />,
    ssr: false,
  },
);
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
import { formatLongDate, formatTime, todayIso } from "@/lib/utils";
import {
  italianPhoneValidationError,
  normalizeItalianPhone,
  validateItalianPhone,
} from "@/lib/validation/phone";

import type { BookingDraft, BookingFieldErrors, BookingFieldName, DecoratedSlot } from "./booking/types";
import { BookingSuccessView } from "./booking/BookingSuccessView";
import { BookingParamsSelector } from "./booking/BookingParamsSelector";
import { TimeSlotSelector } from "./booking/TimeSlotSelector";
import { CustomerDetailsForm } from "./booking/CustomerDetailsForm";

const baseDraft: BookingDraft = {
  date: todayIso(),
  pax: "",
  roomCode: "",
  isAfterDinner: false,
  childrenCount: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  note: "",
  privacyAccepted: true,
  marketingAccepted: true,
};

const SALA_CENTRALE_ROOM_CODE = "da1d57f0-e0d5-4d7e-86be-9f8300f388b8";
const AREA_FAMILY_ROOM_CODE = "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c";

const parsePositiveInteger = (value: string) => {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const formatReservationDateLabel = (value?: string) => {
  if (!value || Number.isNaN(Date.parse(value))) {
    return "";
  }

  return formatLongDate(value);
};

const formatReservationTimeLabel = (value?: string) => {
  if (!value || Number.isNaN(Date.parse(value))) {
    return "";
  }

  return formatTime(value);
};

const buildDraftFallback = (
  firstName?: string,
  lastName?: string,
  email?: string,
  phone?: string,
  marketingConsent?: boolean,
): BookingDraft => {
  const rawPhone = (phone ?? "").replace(/\D/g, "");
  const phoneWithPrefix = rawPhone ? (rawPhone.startsWith("39") ? `+${rawPhone}` : `+39${rawPhone}`) : "";

  return {
    ...baseDraft,
    firstName: firstName?.trim() ?? "",
    lastName: lastName?.trim() ?? "",
    email: normalizeCustomerEmail(email),
    phone: phoneWithPrefix,
    marketingAccepted: marketingConsent === true ? true : baseDraft.marketingAccepted,
  };
};

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

const getVisibleSlots = (
  availabilityDays: BookingAvailabilityResponse["days"],
  isAfterDinner?: boolean,
): DecoratedSlot[] => {
  return availabilityDays.flatMap((day) =>
    day.bands.flatMap((band) =>
      band.slots
        .filter((slot) => {
          if (isAfterDinner) {
            return slot.time >= "22:30";
          }

          return true;
        })
        .map((slot) => ({
          ...slot,
          bandLabel: band.label,
          date: day.date,
        })),
    ),
  );
};

const fallbackWaitlistSlots = [
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
];

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const parseStoredDraft = (
  raw: string,
  fallbackDraft: BookingDraft,
  marketingConsent?: boolean,
): BookingDraft | null => {
  const parsed = JSON.parse(raw) as Partial<BookingDraft>;
  const currentDate =
    typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : fallbackDraft.date;

  return {
    date: currentDate,
    pax: typeof parsed.pax === "string" ? parsed.pax : fallbackDraft.pax,
    roomCode: typeof parsed.roomCode === "string" ? parsed.roomCode : "",
    isAfterDinner: typeof parsed.isAfterDinner === "boolean" ? parsed.isAfterDinner : false,
    childrenCount:
      typeof parsed.childrenCount === "string"
        ? parsed.childrenCount
        : fallbackDraft.childrenCount,
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
      typeof parsed.phone === "string"
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
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});

  const [customModuleCode, setCustomModuleCode] = useState("");
  const [isRoomSelectionDisabled, setIsRoomSelectionDisabled] = useState(false);
  const [matchDrinkMen, setMatchDrinkMen] = useState("0");
  const [matchDrinkWomen, setMatchDrinkWomen] = useState("0");
  const [matchDrinkAgeGroup, setMatchDrinkAgeGroup] = useState("");

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
      "matchDrinkMen",
      "matchDrinkWomen",
      "matchDrinkAgeGroup",
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
        matchDrinkMen: dateFieldRef.current,
        matchDrinkWomen: dateFieldRef.current,
        matchDrinkAgeGroup: dateFieldRef.current,
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

    if (isThursdaySelected) {
      if (!matchDrinkAgeGroup) {
        errors.matchDrinkAgeGroup = "Seleziona la fascia d'età del tuo gruppo.";
      }
      const men = parseInt(matchDrinkMen, 10);
      const women = parseInt(matchDrinkWomen, 10);
      if (isNaN(men) || men < 0) {
        errors.matchDrinkMen = "Inserisci un numero valido di uomini.";
      }
      if (isNaN(women) || women < 0) {
        errors.matchDrinkWomen = "Inserisci un numero valido di donne.";
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
  const isThursdaySelected = Boolean(
    draft.date &&
      !Number.isNaN(Date.parse(`${draft.date}T00:00:00`)) &&
      new Date(`${draft.date}T00:00:00`).getDay() === 4,
  );
  const matchDrinkNote = isThursdaySelected
    ? `Uomini: ${matchDrinkMen} | Donne: ${matchDrinkWomen} | Fascia età: ${matchDrinkAgeGroup}`
    : "";
  const composedCustomerNote = [
    draft.isAfterDinner ? "INGRESSO DOPO CENA" : "",
    isAreaFamily && draft.childrenCount ? `Bambini: ${draft.childrenCount}` : "",
    matchDrinkNote,
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
    draft.date && !Number.isNaN(Date.parse(`${draft.date}T00:00:00`)) && new Date(`${draft.date}T00:00:00`).getDay() === 0,
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
                isThursdaySelected={isThursdaySelected}
                matchDrinkMen={matchDrinkMen}
                setMatchDrinkMen={setMatchDrinkMen}
                matchDrinkWomen={matchDrinkWomen}
                setMatchDrinkWomen={setMatchDrinkWomen}
                matchDrinkAgeGroup={matchDrinkAgeGroup}
                setMatchDrinkAgeGroup={setMatchDrinkAgeGroup}
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

              {activeRoomCode && selectedRoom && !isRoomSelectionDisabled ? (
                <TortugaMapViewer
                  roomCode={activeRoomCode}
                  roomName={selectedRoom.publicName || selectedRoom.name}
                />
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
