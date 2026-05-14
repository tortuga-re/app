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
  CoopertoAddPointsRequest,
  CoopertoCreateContactMovementRequest,
  CoopertoCreateReservationMovementRequest,
} from "@/lib/cooperto/types";
import { logServerEvent, measureServerOperation } from "@/lib/observability";
import { buildCoopertoDateTime, buildCoopertoNowDateTime } from "@/lib/utils";
import { normalizeItalianPhone } from "@/lib/validation/phone";

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

  const url = withQuery(path, init?.query ?? {});

  logServerEvent("info", "cooperto_request_prepared", {
    path,
    method: init?.method || "GET",
    hasBody: Boolean(init?.body),
    queryKeys: Object.keys(init?.query ?? {}).length,
  });

  const response = await measureServerOperation(
    "cooperto_request",
    async () =>
      fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${coopertoConfig.apiKey}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
        cache: "no-store",
      }),
    {
      path,
      method: init?.method || "GET",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`[Cooperto API Error] ${init?.method || "GET"} ${path}`, {
      status: response.status,
      statusText: response.statusText,
      body,
    });
    throw new Error(body || `Cooperto ha risposto con ${response.status}.`);
  }

  const body = await response.text();

  if (!body) {
    return null as T;
  }

  try {
    const parsed = JSON.parse(body);
    return parsed as T;
  } catch (parseError) {
    console.error(`[Cooperto API Parse Error] ${path}`, { body, error: parseError });
    throw new Error("Risposta da Cooperto non valida (JSON corrotto).");
  }
};

/**
 * Esegue una funzione con tentativi multipli in caso di errori di transazione Cooperto.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 5, delayMs = 3000 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Controlliamo se è un errore di transazione (tipico di SQL Server/EF su Cooperto)
      const isTransactionError = 
        errorMessage.includes("starting a transaction") || 
        errorMessage.includes("deadlock") ||
        errorMessage.includes("transaction was aborted");

      if (isTransactionError && attempt < maxRetries) {
        const waitTime = delayMs * attempt;
        console.warn(`[Cooperto Retry] Errore di transazione rilevato (Tentativo ${attempt}/${maxRetries}). Nuova prova tra ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

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

const getCoopertoNationalPhone = (value?: string) =>
  normalizeItalianPhone(value ?? "")?.nationalNumber ?? "";

const getCoopertoInternationalPhone = (value?: string) =>
  normalizeItalianPhone(value ?? "")?.normalizedE164 ?? "";
const normalizeContactCode = (value?: string) => value?.trim() ?? "";

const buildWaitlistNote = (input: WaitlistCreateInput) => {
  const roomName = input.roomCode ? tortugaRooms[input.roomCode] : "";
  const contextLines = [
    "Richiesta lista d'attesa da web app Tortuga.",
    `Data desiderata: ${input.date}.`,
    `Orario desiderato: ${input.requestedTime?.trim() || "Prima disponibilita utile"}.`,
    `Persone richieste: ${input.pax}.`,
    roomName ? `Sala desiderata: ${roomName}.` : "",
  ].filter(Boolean);

  if (!input.note?.trim()) {
    return contextLines.join("\n");
  }

  return [...contextLines, "", `Note cliente: ${input.note.trim()}`].join("\n");
};

const buildBookingNote = (input: BookingCreateInput) => {
  const roomName = input.roomCode ? tortugaRooms[input.roomCode] : "";
  const roomLine = roomName ? `Sala scelta: ${roomName}.` : "";

  if (!input.note?.trim()) {
    return roomLine || undefined;
  }

  return roomLine
    ? `${roomLine}\n\nNote cliente: ${input.note.trim()}`
    : input.note.trim();
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
    CodiceSala: input.roomCode,
    CodiceModulo: coopertoConfig.bookingModuleCode,
    CodiceModuloPrenotazione: coopertoConfig.bookingModuleCode,
    Pax: input.pax,
    Nome: input.firstName,
    Cognome: input.lastName,
    Telefono: getCoopertoNationalPhone(input.phone),
    Email: input.email,
    Note: buildBookingNote(input),
    ConsensoPrivacy: input.privacyAccepted,
    ConsensoMarketing: input.marketingAccepted,
  };

  try {
    const reservation = await coopertoFetch<CoopertoReservation>("/api/Prenotazioni/Crea", {
      method: "POST",
      query: {
        codiceSala: input.roomCode,
        codiceModulo: coopertoConfig.bookingModuleCode,
      },
      body: JSON.stringify(requestBody),
    });

    return {
      source: "live",
      reservation,
    };
  } catch (error) {
    console.error("[Cooperto createBooking] Errore critico:", error);
    if (hasCoopertoLiveConfig) {
      throw error;
    }
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
    CodiceSala: input.roomCode,
    CodiceModulo: coopertoConfig.bookingModuleCode,
    CodiceModuloPrenotazione: coopertoConfig.bookingModuleCode,
    Nome: input.firstName,
    Cognome: input.lastName,
    Telefono: getCoopertoNationalPhone(input.phone),
    Email: input.email,
    Pax: input.pax,
    Note: buildWaitlistNote(input),
    ConsensoPrivacy: input.privacyAccepted,
    ConsensoMarketing: input.marketingAccepted,
  };

  try {
    const entry = await coopertoFetch<CoopertoWaitlistEntry>("/api/Coda/Crea", {
      method: "POST",
      query: {
        codiceSala: input.roomCode,
        codiceModulo: coopertoConfig.bookingModuleCode,
      },
      body: JSON.stringify(requestBody),
    });

    return {
      source: "live",
      entry,
    };
  } catch (error) {
    console.error("[Cooperto createWaitlist] Errore critico:", error);
    if (hasCoopertoLiveConfig) {
      throw error;
    }
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
  } catch (error) {
    console.warn(`[Cooperto getProfileData] Fallback a mock per ${query} (${lookupMode}):`, error);
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
    Telefono: getCoopertoInternationalPhone(input.phone),
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
  } catch (error) {
    console.error("[Cooperto updateProfileContact] Errore critico:", error);
    if (hasCoopertoLiveConfig) {
      throw error;
    }
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

const fidelityActivationError =
  "Non siamo riusciti ad attivare la card in automatico. Chiedi a un pirata.";

const updateContactFidelityCard = async (
  requestBody: CoopertoUpdateFidelityCardRequest,
) => {
  return await withRetry(() => 
    coopertoFetch<unknown>("/api/Contatti/AggiornaFidelityCard", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })
  );
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

  if (!hasCoopertoLiveConfig) {
    return mockActivateFidelityCard(
      normalizedContactCode,
      coopertoConfig.defaultFidelityCardCode || "mock-auto-fidelity",
    );
  }

  try {
    console.info(`[Cooperto Fidelity] Tentativo attivazione automatica per: ${normalizedContactCode}`);
    await updateContactFidelityCard({
      codiceContatto: normalizedContactCode,
    });
  } catch (autoActivationError) {
    console.warn(`[Cooperto Fidelity] Attivazione automatica (senza codice) fallita per: ${normalizedContactCode}`, {
      error: autoActivationError instanceof Error ? autoActivationError.message : autoActivationError,
      cause: autoActivationError instanceof Error ? autoActivationError.cause : undefined,
    });
    const configuredCardCode = coopertoConfig.defaultFidelityCardCode;

    if (!configuredCardCode) {
      console.error("[Cooperto Fidelity] Nessun codice card predefinito configurato (COOPERTO_DEFAULT_FIDELITY_CARD_CODE).");
      throw new Error(fidelityActivationError, { cause: autoActivationError });
    }

    try {
      console.info(`[Cooperto Fidelity] Tentativo attivazione con codice predefinito (${configuredCardCode}) per: ${normalizedContactCode}`);
      await updateContactFidelityCard({
        codiceContatto: normalizedContactCode,
        codiceCard: configuredCardCode,
      });
    } catch (configuredActivationError) {
      console.error(`[Cooperto Fidelity] Attivazione con codice predefinito (${configuredCardCode}) fallita per: ${normalizedContactCode}`, {
        error: configuredActivationError instanceof Error ? configuredActivationError.message : configuredActivationError,
        cause: configuredActivationError instanceof Error ? configuredActivationError.cause : undefined,
      });
      throw new Error(fidelityActivationError, {
        cause: configuredActivationError,
      });
    }
  }

  const refreshedProfile = await getProfileData("contactCode", normalizedContactCode);
  const refreshedCardCode = refreshedProfile.contact?.CodiceCard?.trim() ?? "";

  if (!refreshedCardCode) {
    throw new Error(fidelityActivationError);
  }

  return {
    source: "live",
    status: "activated",
    cardCode: refreshedCardCode,
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

    return {
      source: "live",
      venues: venuesResponse.data.map((venue) => {
        const hoursResult = hoursEntries.find(
          (entry) =>
            entry.status === "fulfilled" && entry.value.code === venue.CodiceSede,
        );

        return {
          ...venue,
          isPrimary: venue.CodiceSede === coopertoConfig.sedeCode,
          hours: hoursResult?.status === "fulfilled" ? hoursResult.value.hours : null,
        };
      }),
    };
  } catch {
    return fallbackSource(await mockVenues());
  }
};

export const addPointsToContact = async (
  request: CoopertoAddPointsRequest,
): Promise<number> => {
  if (!hasCoopertoLiveConfig) {
    console.info("[Cooperto Mock] Aggiunti punti:", request);
    return (request.punti || 0) + 100; // Mock return
  }

  console.info(`[Cooperto API] Aggiunta punti per ${request.codiceContatto}: ${request.punti} punti.`);

  return await withRetry(() => 
    coopertoFetch<number>("/api/Contatti/AggiungiPuntiCard", {
      method: "POST",
      body: JSON.stringify(request),
    }),
    { maxRetries: 3, delayMs: 2000 }
  );
};

export const createContactMovement = async (
  request: CoopertoCreateContactMovementRequest,
): Promise<boolean> => {
  if (!hasCoopertoLiveConfig) {
    console.info("[Cooperto Mock] Creato movimento contatto:", request);
    return true;
  }

  console.info(`[Cooperto API] Creazione movimento per ${request.CodiceContatto}: €${request.Importo}.`);

  return await coopertoFetch<boolean>("/api/Contatti/CreaMovimento", {
    method: "POST",
    body: JSON.stringify(request),
  });
};

export const createReservationMovement = async (
  request: CoopertoCreateReservationMovementRequest,
): Promise<boolean> => {
  if (!hasCoopertoLiveConfig) {
    console.info("[Cooperto Mock] Creato movimento prenotazione:", request);
    return true;
  }

  console.info(`[Cooperto API] Creazione movimento su prenotazione ${request.CodicePrenotazione}: €${request.Importo}.`);

  return await coopertoFetch<boolean>("/api/Prenotazioni/CreaMovimento", {
    method: "POST",
    body: JSON.stringify(request),
  });
};

export const getContactReservations = async (
  contactCode: string,
): Promise<CoopertoReservation[]> => {
  if (!hasCoopertoLiveConfig) {
    return [];
  }

  const response = await coopertoFetch<CoopertoListResponse<CoopertoReservation>>(
    "/api/Prenotazioni/ElencoByCodiceContatto",
    {
      query: {
        codiceContatto: contactCode,
        skip: 0,
        pageSize: 100,
      },
    },
  );

  return response.data;
};
