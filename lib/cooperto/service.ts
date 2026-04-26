import {
  coopertoConfig,
  hasCoopertoLiveConfig,
  tortugaRooms,
} from "@/lib/config";
import {
  mockBookingAvailability,
  mockBookingBootstrap,
  mockBookingCreate,
  mockProfile,
  mockFidelityCards,
  mockActivateFidelityCard,
  mockUpdateProfileContact,
  mockWaitlistCreate,
  mockVenues,
} from "@/lib/cooperto/mock";
import type {
  BookingAvailabilityResponse,
  BookingBootstrapResponse,
  BookingCreateInput,
  BookingCreateResponse,
  BookingDay,
  BookingModule,
  BookingRoom,
  CoopertoBookingDay,
  CoopertoBookingModule,
  CoopertoContact,
  CoopertoCreateContactRequest,
  CoopertoCreateQueueRequest,
  CoopertoCreateReservationRequest,
  DataSource,
  CoopertoFidelityCard,
  CoopertoListResponse,
  CoopertoRegisterVisitRequest,
  CoopertoRegisterVisitResponse,
  CoopertoUpdateFidelityCardRequest,
  CoopertoReservation,
  CoopertoWaitlistEntry,
  CoopertoVenue,
  CoopertoVenueHours,
  ProfileUpdateInput,
  ProfileResponse,
  FidelityActivationResponse,
  RegisterVisitResponse,
  UpcomingReservation,
  VenueResponse,
  WaitlistCreateInput,
  WaitlistCreateResponse,
} from "@/lib/cooperto/types";
import { buildCoopertoDateTime, buildCoopertoNowDateTime } from "@/lib/utils";

const withQuery = (path: string, query: Record<string, string | number | undefined>) => {
  const url = new URL(path, coopertoConfig.apiBaseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

const coopertoFetch = async <T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> => {
  if (!hasCoopertoLiveConfig) {
    throw new Error("Configurazione Cooperto non presente.");
  }

  const response = await fetch(withQuery(path, init?.query ?? {}), {
    ...init,
    headers: {
      Authorization: `Bearer ${coopertoConfig.apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Cooperto ha risposto con ${response.status}.`);
  }

  const body = await response.text();

  if (!body) {
    return null as T;
  }

  return JSON.parse(body) as T;
};

const normalizeRooms = (rooms?: CoopertoBookingModule["SaleAbilitate"]): BookingRoom[] => {
  const allowedCodes =
    coopertoConfig.bookingRoomCodes.length > 0
      ? new Set(coopertoConfig.bookingRoomCodes)
      : null;

  return (rooms ?? [])
    .filter((room) => {
      if (!room.CodiceSala) {
        return false;
      }
      return allowedCodes ? allowedCodes.has(room.CodiceSala) : true;
    })
    .map((room) => ({
      code: room.CodiceSala ?? "",
      name: room.NomePubblico || room.Nome || tortugaRooms[room.CodiceSala ?? ""] || "Sala",
      publicName:
        room.NomePubblico || tortugaRooms[room.CodiceSala ?? ""] || room.Nome || undefined,
    }));
};

const normalizeModule = (module: CoopertoBookingModule | null): BookingModule | null => {
  if (!module?.CodiceModulo) {
    return null;
  }

  const rooms = normalizeRooms(module.SaleAbilitate);
  return {
    code: module.CodiceModulo,
    name: module.Nome || "Prenotazioni Tortuga",
    type: module.TipoModulo,
    allowsRoomSelection: Boolean(module.AbilitaSceltaSala),
    rooms,
  };
};

const normalizeDays = (days: CoopertoBookingDay[]): BookingDay[] =>
  days.map((day) => ({
    date: day.Data ?? "",
    unavailableMessage: day.MessaggioOrariNonDisponibili,
    eventBlocked: Boolean(day.BloccoPerEvento),
    redirectOnEvent: Boolean(day.RedirectPerEvento),
    redirectUrl: day.LinkRedirectEvento,
    bands:
      day.FasceOrarie?.map((band) => ({
        code: band.CodiceFascia ?? band.Etichetta ?? "fascia",
        label: band.Etichetta ?? "Fascia oraria",
        type: band.TipoFascia,
        durationMinutes: band.MinutiPermanenza,
        warning: band.Avviso,
        showWarningCheckbox: Boolean(band.MostraFlagPresaVisioneAvviso),
        slots:
          band.Slots?.map((slot) => ({
            time: slot.Orario ?? "",
            enabled: Boolean(slot.Abilitato),
            statusCode: slot.IDStatoPrenotazioneDefault ?? 1,
            beyondMidnight: Boolean(slot.SlotOltreMezzanotte),
            discount:
              slot.MostraSconto || slot.Sconto || slot.MessaggioSconto
                ? {
                    amount: slot.Sconto,
                    labelType: slot.TipoLabelSconto,
                    code: slot.CodiceSconto,
                    icon: slot.IconaSconto,
                    message: slot.MessaggioSconto,
                  }
                : undefined,
          })) ?? [],
      })) ?? [],
  }));

const fallbackSource = <T extends { source: DataSource }>(data: T): T => ({
  ...data,
  source: "fallback" as T["source"],
});

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
const normalizeContactCode = (value?: string) => value?.trim() ?? "";

const buildWaitlistNote = (input: WaitlistCreateInput) => {
  const roomName = input.roomCode ? tortugaRooms[input.roomCode] : "";
  const contextLines = [
    "Richiesta lista d'attesa da web app Tortuga.",
    `Data desiderata: ${input.date}.`,
    roomName ? `Sala desiderata: ${roomName}.` : "",
  ].filter(Boolean);

  if (!input.note?.trim()) {
    return contextLines.join("\n");
  }

  return [...contextLines, "", `Note cliente: ${input.note.trim()}`].join("\n");
};

const buildBirthDateDateTime = (birthDate?: string) =>
  birthDate ? `${birthDate}T00:00:00` : undefined;

const cleanStateLabel = (value?: string) => value?.trim().toLowerCase() ?? "";

const getUpcomingReservationStateLabel = (
  reservation: CoopertoReservation,
): string | null => {
  const stateLabel = cleanStateLabel(reservation.LabelStato);

  if (
    /annull|cancell|cancel|rifiut|respint|scadut|chius|eliminat|no[-\s]?show/.test(
      stateLabel,
    )
  ) {
    return null;
  }

  if (/attesa/.test(stateLabel)) {
    return "In lista d'attesa";
  }

  if (/accett|confermat|approvat/.test(stateLabel) || reservation.CodiceStato === 2) {
    return "Accettata";
  }

  if (
    /da confermare|richiest|nuov|in verifica|pending/.test(stateLabel) ||
    reservation.CodiceStato === 1
  ) {
    return "Da confermare";
  }

  return reservation.LabelStato?.trim() || null;
};

const normalizeUpcomingReservations = (
  reservations: CoopertoReservation[],
  filterContext: {
    expectedEmail?: string;
    expectedContactCode?: string;
  },
): UpcomingReservation[] => {
  const now = Date.now();
  const expectedEmail = normalizeEmail(filterContext.expectedEmail);
  const expectedContactCode = normalizeContactCode(filterContext.expectedContactCode);
  const filterMode = expectedEmail
    ? "email-strict"
    : expectedContactCode
      ? "contact-code-strict"
      : "no-identity-empty";

  if (!expectedEmail && !expectedContactCode) {
    console.info("[Tortuga reservations] filtro applicato", {
      emailUtente: null,
      codiceContatto: null,
      prenotazioniRicevute: reservations.length,
      prenotazioniMostrate: 0,
      filtro: filterMode,
    });
    return [];
  }

  const normalizedReservations: Array<UpcomingReservation | null> = reservations.map(
    (reservation) => {
      const reservationEmail = normalizeEmail(reservation.Email);
      const reservationContactCode = normalizeContactCode(reservation.CodiceContatto);

      if (expectedEmail && reservationEmail !== expectedEmail) {
        return null;
      }

      if (!expectedEmail && expectedContactCode && reservationContactCode !== expectedContactCode) {
        return null;
      }

      const dateTime = reservation.DataPrenotazione ?? "";
      const reservationTimestamp = Date.parse(dateTime);
      const stateLabel = getUpcomingReservationStateLabel(reservation);

      if (!dateTime || Number.isNaN(reservationTimestamp) || reservationTimestamp <= now) {
        return null;
      }

      if (!stateLabel) {
        return null;
      }

      const roomName =
        reservation.NomeSala?.trim() ||
        reservation.Tavoli?.map((table) => table.NomeTavolo?.trim())
          .filter(Boolean)
          .join(", ") ||
        undefined;

      return {
        reservationCode: reservation.CodicePrenotazione,
        email: reservationEmail || undefined,
        contactCode: reservationContactCode || undefined,
        dateTime,
        pax: reservation.Pax,
        roomName,
        stateLabel,
      };
    },
  );

  return normalizedReservations
    .filter((reservation): reservation is UpcomingReservation => Boolean(reservation))
    .sort((left, right) => Date.parse(left.dateTime) - Date.parse(right.dateTime));
};

export const getBookingBootstrap = async (): Promise<BookingBootstrapResponse> => {
  if (!hasCoopertoLiveConfig) {
    return mockBookingBootstrap();
  }

  try {
    const response = await coopertoFetch<CoopertoListResponse<CoopertoBookingModule>>(
      "/api/Prenotazioni/ElencoModuliPrenotazione",
      {
        query: {
          codiceSede: coopertoConfig.sedeCode,
          skip: 0,
          pageSize: 100,
        },
      },
    );

    const selectedModule =
      response.data.find(
        (module) => module.CodiceModulo === coopertoConfig.bookingModuleCode,
      ) ?? null;

    const normalized = normalizeModule(selectedModule);

    if (!normalized) {
      throw new Error("Modulo prenotazione configurato non trovato.");
    }

    return {
      source: "live",
      module: normalized,
      rooms: normalized.rooms,
      defaultRoomCode: normalized.rooms[0]?.code,
    };
  } catch {
    return fallbackSource(await mockBookingBootstrap());
  }
};

export const getBookingAvailability = async (
  date: string,
  pax: number,
  roomCode?: string,
): Promise<BookingAvailabilityResponse> => {
  if (!hasCoopertoLiveConfig) {
    return mockBookingAvailability(date, pax, roomCode);
  }

  try {
    const response = await coopertoFetch<CoopertoBookingDay[]>(
      "/api/Prenotazioni/OrariModulo",
      {
        query: {
          codiceModulo: coopertoConfig.bookingModuleCode,
          data: date,
          pax,
          codiceSala: roomCode,
        },
      },
    );

    return {
      source: "live",
      date,
      pax,
      roomCode,
      days: normalizeDays(response),
    };
  } catch {
    return fallbackSource(await mockBookingAvailability(date, pax, roomCode));
  }
};

export const createBooking = async (
  input: BookingCreateInput,
): Promise<BookingCreateResponse> => {
  if (!hasCoopertoLiveConfig) {
    return mockBookingCreate(input);
  }

  const requestBody: CoopertoCreateReservationRequest = {
    CodiceSede: coopertoConfig.sedeCode,
    DataPrenotazione: buildCoopertoDateTime(input.date, input.time),
    CodiceStato: input.statusCode ?? 1,
    Pax: input.pax,
    Nome: input.firstName,
    Cognome: input.lastName,
    Telefono: input.phone,
    Email: input.email,
    Note: input.note,
    ConsensoPrivacy: input.privacyAccepted,
    ConsensoMarketing: input.marketingAccepted,
  };

  try {
    const reservation = await coopertoFetch<CoopertoReservation>("/api/Prenotazioni/Crea", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    return {
      source: "live",
      reservation,
    };
  } catch {
    return fallbackSource(await mockBookingCreate(input));
  }
};

export const createWaitlist = async (
  input: WaitlistCreateInput,
): Promise<WaitlistCreateResponse> => {
  if (!hasCoopertoLiveConfig) {
    return mockWaitlistCreate(input);
  }

  const requestBody: CoopertoCreateQueueRequest = {
    CodiceSede: coopertoConfig.sedeCode,
    Nome: input.firstName,
    Cognome: input.lastName,
    Telefono: input.phone,
    Email: input.email,
    Pax: input.pax,
    Note: buildWaitlistNote(input),
    ConsensoPrivacy: input.privacyAccepted,
    ConsensoMarketing: input.marketingAccepted,
  };

  try {
    const entry = await coopertoFetch<CoopertoWaitlistEntry>("/api/Coda/Crea", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    return {
      source: "live",
      entry,
    };
  } catch {
    return fallbackSource(await mockWaitlistCreate(input));
  }
};

export const getProfileData = async (
  lookupMode: "email" | "contactCode",
  query: string,
): Promise<ProfileResponse> => {
  if (!hasCoopertoLiveConfig) {
    return mockProfile(query, lookupMode);
  }

  try {
    const contact = await coopertoFetch<CoopertoContact>(
      lookupMode === "email"
        ? "/api/Contatti/DettagliByEMail"
        : "/api/Contatti/DettagliByCodiceContatto",
      {
        query:
          lookupMode === "email"
            ? { email: query }
            : { codiceContatto: query },
      },
    );

    const contactCode =
      contact.CodiceContatto || (lookupMode === "contactCode" ? query : "");
    const expectedReservationEmail =
      lookupMode === "email" ? normalizeEmail(query) : normalizeEmail(contact.Email);

    const [points, coupons, cards] = await Promise.allSettled([
      contactCode
        ? coopertoFetch<number>("/api/Contatti/SaldoPuntiByCodiceContatto", {
            query: { codiceContatto: contactCode },
          })
        : Promise.resolve(null),
      contactCode
        ? coopertoFetch<ProfileResponse["coupons"]>(
            "/api/Contatti/ElencoCouponContatto",
            {
              query: { codiceContatto: contactCode },
            },
          )
        : Promise.resolve([]),
      coopertoFetch<CoopertoListResponse<CoopertoFidelityCard>>("/api/FidelityCard/Elenco", {
        query: { skip: 0, pageSize: 100 },
      }),
    ]);

    const reservations =
      contactCode
        ? await coopertoFetch<CoopertoListResponse<CoopertoReservation>>(
            "/api/Prenotazioni/ElencoByCodiceContatto",
            {
              query: {
                codiceContatto: contactCode,
                skip: 0,
                pageSize: 100,
              },
            },
          ).catch(() => null)
        : null;

    const upcomingReservations = normalizeUpcomingReservations(reservations?.data ?? [], {
      expectedEmail: expectedReservationEmail,
      expectedContactCode: contactCode,
    });

    console.info("[Tortuga reservations] filtro applicato", {
      emailUtente: expectedReservationEmail || null,
      codiceContatto: contactCode || null,
      prenotazioniRicevute: reservations?.data?.length ?? 0,
      prenotazioniMostrate: upcomingReservations.length,
      filtro: expectedReservationEmail ? "email-strict" : "contact-code-strict",
      prenotazioniRicevuteDebug:
        reservations?.data?.map((reservation) => ({
          codicePrenotazione: reservation.CodicePrenotazione ?? null,
          email: normalizeEmail(reservation.Email) || null,
          codiceContatto: normalizeContactCode(reservation.CodiceContatto) || null,
          dataPrenotazione: reservation.DataPrenotazione ?? null,
        })) ?? [],
    });

    return {
      source: "live",
      contact,
      points: points.status === "fulfilled" ? points.value : null,
      coupons: coupons.status === "fulfilled" ? coupons.value : [],
      fidelityCards: cards.status === "fulfilled" ? cards.value.data : [],
      upcomingReservations,
      lookupMode,
      query,
    };
  } catch {
    return fallbackSource(await mockProfile(query, lookupMode));
  }
};

export const updateProfileContact = async (
  input: ProfileUpdateInput,
): Promise<ProfileResponse> => {
  if (!hasCoopertoLiveConfig) {
    return mockUpdateProfileContact(input);
  }

  const requestBody: CoopertoCreateContactRequest = {
    Nome: input.firstName,
    Cognome: input.lastName,
    Email: input.email,
    Telefono: input.phone,
    DataDiNascita: buildBirthDateDateTime(input.birthDate),
    ConsensoMarketing: input.marketingConsent,
    SovrascriviDati: true,
  };

  try {
    const contact = await coopertoFetch<CoopertoContact>("/api/Contatti/Crea", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    const nextEmail = contact.Email?.trim() || input.email.trim();
    const nextContactCode = contact.CodiceContatto?.trim();

    if (nextEmail) {
      return getProfileData("email", nextEmail);
    }

    if (nextContactCode) {
      return getProfileData("contactCode", nextContactCode);
    }

    return {
      source: "live",
      contact,
      points: contact.SaldoPuntiCard ?? null,
      coupons: [],
      fidelityCards: [],
      upcomingReservations: [],
      lookupMode: "email",
      query: input.email,
    };
  } catch {
    return fallbackSource(await mockUpdateProfileContact(input));
  }
};

export const getFidelityCards = async (): Promise<CoopertoFidelityCard[]> => {
  if (!hasCoopertoLiveConfig) {
    return mockFidelityCards();
  }

  const response = await coopertoFetch<CoopertoListResponse<CoopertoFidelityCard>>(
    "/api/FidelityCard/Elenco",
    {
      query: { skip: 0, pageSize: 100 },
    },
  );

  return response.data;
};

const resolveDefaultFidelityCardCode = async () => {
  if (coopertoConfig.defaultFidelityCardCode) {
    return coopertoConfig.defaultFidelityCardCode;
  }

  const cards = await getFidelityCards();
  return cards.find((card) => card.CodiceCard?.trim())?.CodiceCard?.trim() ?? "";
};

export const activateFidelityCard = async ({
  contactCode,
}: {
  contactCode: string;
}): Promise<FidelityActivationResponse> => {
  const normalizedContactCode = contactCode.trim();

  if (!normalizedContactCode) {
    throw new Error("Codice contatto mancante.");
  }

  const profile = await getProfileData("contactCode", normalizedContactCode);
  const activeCardCode = profile.contact?.CodiceCard?.trim() ?? "";

  if (activeCardCode) {
    return {
      source: profile.source,
      status: "already_active",
      cardCode: activeCardCode,
      profile,
    };
  }

  const cardCode = await resolveDefaultFidelityCardCode();

  if (!cardCode) {
    throw new Error("Nessuna fidelity card disponibile.");
  }

  if (!hasCoopertoLiveConfig) {
    return mockActivateFidelityCard(normalizedContactCode, cardCode);
  }

  const requestBody: CoopertoUpdateFidelityCardRequest = {
    codiceContatto: normalizedContactCode,
    codiceCard: cardCode,
  };

  await coopertoFetch<unknown>("/api/Contatti/AggiornaFidelityCard", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const refreshedProfile = await getProfileData("contactCode", normalizedContactCode);

  return {
    source: "live",
    status: "activated",
    cardCode,
    profile: refreshedProfile,
  };
};

export const registerContactVisit = async ({
  contactCode,
  venueCode,
}: {
  contactCode: string;
  venueCode: string;
}): Promise<RegisterVisitResponse> => {
  if (!hasCoopertoLiveConfig) {
    throw new Error("Configurazione Cooperto non presente.");
  }

  const visitDate = buildCoopertoNowDateTime();
  const requestBody: CoopertoRegisterVisitRequest = {
    codiceContatto: contactCode,
    codiceSede: venueCode,
    dataVisita: visitDate,
  };

  const visit = await coopertoFetch<CoopertoRegisterVisitResponse>(
    "/api/Contatti/RegistraVisita",
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
  );

  return {
    source: "live",
    visit,
    visitDate,
  };
};

export const getVenuesData = async (): Promise<VenueResponse> => {
  if (!hasCoopertoLiveConfig) {
    return mockVenues();
  }

  try {
    const venuesResponse = await coopertoFetch<CoopertoListResponse<CoopertoVenue>>(
      "/api/Sedi/Elenco",
      {
        query: { skip: 0, pageSize: 100 },
      },
    );

    const hoursEntries = await Promise.allSettled(
      venuesResponse.data.map(async (venue) => ({
        code: venue.CodiceSede ?? "",
        hours: venue.CodiceSede
          ? await coopertoFetch<CoopertoVenueHours>("/api/Sedi/ElencoOrari", {
              query: { codiceSede: venue.CodiceSede },
            })
          : null,
      })),
    );

    const hoursMap = new Map<string, CoopertoVenueHours | null>();
    for (const entry of hoursEntries) {
      if (entry.status === "fulfilled") {
        hoursMap.set(entry.value.code, entry.value.hours);
      }
    }

    return {
      source: "live",
      venues: venuesResponse.data.map((venue) => ({
        ...venue,
        isPrimary: venue.CodiceSede === coopertoConfig.sedeCode,
        hours: venue.CodiceSede ? hoursMap.get(venue.CodiceSede) ?? null : null,
      })),
    };
  } catch {
    return fallbackSource(await mockVenues());
  }
};
