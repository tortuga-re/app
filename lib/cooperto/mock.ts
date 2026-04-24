import { coopertoConfig, tortugaRooms } from "@/lib/config";
import { delay, todayIso } from "@/lib/utils";
import type {
  BookingAvailabilityResponse,
  BookingBootstrapResponse,
  BookingCreateInput,
  BookingCreateResponse,
  BookingDay,
  BookingModule,
  BookingRoom,
  CoopertoContact,
  CoopertoCoupon,
  CoopertoFidelityCard,
  CoopertoReservation,
  CoopertoWaitlistEntry,
  CoopertoVenueHours,
  ProfileUpdateInput,
  ProfileResponse,
  UpcomingReservation,
  VenueResponse,
  WaitlistCreateInput,
  WaitlistCreateResponse,
} from "@/lib/cooperto/types";

const buildRooms = (): BookingRoom[] =>
  coopertoConfig.bookingRoomCodes.map((code) => ({
    code,
    name: tortugaRooms[code] ?? "Sala Tortuga",
    publicName: tortugaRooms[code] ?? "Sala Tortuga",
  }));

const buildModule = (): BookingModule => ({
  code: coopertoConfig.bookingModuleCode || "mock-module",
  name: "Prenotazioni Tortuga",
  type: "Ristorante",
  allowsRoomSelection: true,
  rooms: buildRooms(),
});

const buildDay = (date: string, pax: number): BookingDay => ({
  date,
  eventBlocked: false,
  redirectOnEvent: false,
  bands: [
    {
      code: "dinner",
      label: "Cena",
      type: "standard",
      durationMinutes: pax >= 6 ? 150 : 120,
      warning: pax >= 8 ? "Per gruppi numerosi potremmo ricontattarti." : "",
      showWarningCheckbox: false,
      slots: [
        { time: "19:15", enabled: true, statusCode: 1, beyondMidnight: false },
        { time: "19:45", enabled: true, statusCode: 1, beyondMidnight: false },
        { time: "20:15", enabled: true, statusCode: 2, beyondMidnight: false },
        { time: "20:45", enabled: pax < 10, statusCode: 1, beyondMidnight: false },
        { time: "21:30", enabled: true, statusCode: 1, beyondMidnight: false },
      ],
    },
  ],
});

const buildContact = (query: string, mode: "email" | "contactCode"): CoopertoContact => ({
  Nome: "Giulia",
  Cognome: "Rossi",
  Email: mode === "email" ? query : "giulia.rossi@example.com",
  Telefono: "+393491234567",
  NumeroVisite: 6,
  CodiceContatto: mode === "contactCode" ? query : "mock-contact-001",
  CodiceCard: "TB-2026-001",
  CodiceCardAssegnata: "bronze-card",
  NomeCardAssegnata: "Bronze Bay",
  SaldoPuntiCard: 140,
  Tags: ["mock", "fidelity", "cliente-abituale"],
  DataCreazione: "2025-11-02T18:30:00+01:00",
  DataUltimaVisita: "2026-04-10T21:00:00+02:00",
  ConsensoPrivacy: 1,
  ConsensoMarketing: 1,
  Note: "Mock locale attivo quando Cooperto non e disponibile.",
});

const buildUpdatedMockContact = (input: ProfileUpdateInput): CoopertoContact => ({
  ...buildContact(input.email, "email"),
  Nome: input.firstName,
  Cognome: input.lastName,
  Email: input.email,
  Telefono: input.phone,
  DataDiNascita: input.birthDate ? `${input.birthDate}T00:00:00` : undefined,
  ConsensoMarketing: input.marketingConsent ? 1 : 0,
});

const buildCoupons = (contactCode: string): CoopertoCoupon[] => [
  {
    CodiceContatto: contactCode,
    CodiceCoupon: "WELCOME-10",
    CodiceCouponContatto: "mock-coupon-1",
    DataCreazione: "2026-04-01T12:00:00+02:00",
    DataScadenza: "2026-05-31T23:59:00+02:00",
    Utilizzato: false,
  },
  {
    CodiceContatto: contactCode,
    CodiceCoupon: "RUM-NIGHT",
    CodiceCouponContatto: "mock-coupon-2",
    DataCreazione: "2026-02-10T19:30:00+01:00",
    DataScadenza: "2026-03-15T23:59:00+01:00",
    Utilizzato: false,
  },
];

const buildCards = (): CoopertoFidelityCard[] => [
  { CodiceCard: "bronze-card", Nome: "Bronze Bay", Livello: 1 },
  { CodiceCard: "gold-card", Nome: "Golden Tide", Livello: 2 },
];

const buildUpcomingReservations = (): UpcomingReservation[] => [];

const buildHours = (): CoopertoVenueHours => ({
  Orari: [
    { CodiceGiorno: 2, Giorno: "Martedi", OraInizio: "19:00", OraFine: "23:30" },
    { CodiceGiorno: 3, Giorno: "Mercoledi", OraInizio: "19:00", OraFine: "23:30" },
    { CodiceGiorno: 4, Giorno: "Giovedi", OraInizio: "19:00", OraFine: "23:30" },
    { CodiceGiorno: 5, Giorno: "Venerdi", OraInizio: "19:00", OraFine: "00:30" },
    { CodiceGiorno: 6, Giorno: "Sabato", OraInizio: "19:00", OraFine: "00:30" },
    { CodiceGiorno: 7, Giorno: "Domenica", OraInizio: "12:30", OraFine: "15:00" },
    { CodiceGiorno: 7, Giorno: "Domenica", OraInizio: "19:00", OraFine: "23:00" },
  ],
  Eccezioni: [],
});

export const mockBookingBootstrap = async (): Promise<BookingBootstrapResponse> => {
  await delay(220);

  const bookingModule = buildModule();
  return {
    source: "mock",
    module: bookingModule,
    rooms: bookingModule.rooms,
    defaultRoomCode: bookingModule.rooms[0]?.code,
  };
};

export const mockBookingAvailability = async (
  date: string,
  pax: number,
  roomCode?: string,
): Promise<BookingAvailabilityResponse> => {
  await delay(240);
  return {
    source: "mock",
    date,
    pax,
    roomCode,
    days: [buildDay(date || todayIso(), pax)],
  };
};

export const mockBookingCreate = async (
  input: BookingCreateInput,
): Promise<BookingCreateResponse> => {
  await delay(360);

  const reservation: CoopertoReservation = {
    CodicePrenotazione: `mock-${Date.now()}`,
    CodiceContatto: "mock-contact-001",
    CodiceSede: coopertoConfig.sedeCode || "mock-sede",
    CodiceSala: input.roomCode,
    NomeSala: input.roomCode ? tortugaRooms[input.roomCode] : undefined,
    CodiceStato: input.statusCode ?? 1,
    LabelStato: (input.statusCode ?? 1) === 2 ? "Confermata" : "Da confermare",
    DataCreazione: new Date().toISOString(),
    DataPrenotazione: `${input.date}T${input.time}:00+02:00`,
    Nome: input.firstName,
    Cognome: input.lastName,
    Email: input.email,
    Telefono: input.phone,
    Pax: input.pax,
    Note: input.note,
  };

  return { source: "mock", reservation };
};

export const mockWaitlistCreate = async (
  input: WaitlistCreateInput,
): Promise<WaitlistCreateResponse> => {
  await delay(320);

  const entry: CoopertoWaitlistEntry = {
    CodiceCoda: `mock-coda-${Date.now()}`,
    CodiceContatto: "mock-contact-001",
    CodiceSede: coopertoConfig.sedeCode || "mock-sede",
    DataCreazione: new Date().toISOString(),
    DataCoda: `${input.date}T19:00:00+02:00`,
    Nome: input.firstName,
    Cognome: input.lastName,
    Telefono: input.phone,
    Email: input.email,
    Pax: input.pax,
    Note: input.note,
    LinkCoda: "https://app.tortugabay.it/prenota",
    MinutiAttesaMin: 20,
    MinutiAttesaMax: 45,
  };

  return { source: "mock", entry };
};

export const mockProfile = async (
  query: string,
  lookupMode: "email" | "contactCode",
): Promise<ProfileResponse> => {
  await delay(200);
  const contact = buildContact(query, lookupMode);

  return {
    source: "mock",
    contact,
    points: 140,
    coupons: buildCoupons(contact.CodiceContatto ?? "mock-contact-001"),
    fidelityCards: buildCards(),
    upcomingReservations: buildUpcomingReservations(),
    lookupMode,
    query,
  };
};

export const mockUpdateProfileContact = async (
  input: ProfileUpdateInput,
): Promise<ProfileResponse> => {
  await delay(220);
  const contact = buildUpdatedMockContact(input);

  return {
    source: "mock",
    contact,
    points: 140,
    coupons: buildCoupons(contact.CodiceContatto ?? "mock-contact-001"),
    fidelityCards: buildCards(),
    upcomingReservations: buildUpcomingReservations(),
    lookupMode: "email",
    query: input.email,
  };
};

export const mockVenues = async (): Promise<VenueResponse> => {
  await delay(180);
  return {
    source: "mock",
    venues: [
      {
        Nome: "Tortuga Bay",
        CodiceSede: coopertoConfig.sedeCode || "mock-sede",
        isPrimary: true,
        hours: buildHours(),
      },
    ],
  };
};
