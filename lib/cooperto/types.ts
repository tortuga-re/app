export type DataSource = "live" | "mock" | "fallback";

export interface CoopertoListResponse<T> {
  data: T[];
  total: number;
  pageSize: number;
  nextPage?: string;
}

export interface CoopertoRoom {
  CodiceSala?: string;
  Nome?: string;
  NomePubblico?: string;
}

export interface CoopertoBookingModule {
  Nome?: string;
  CodiceModulo?: string;
  TipoModulo?: string;
  AbilitaSceltaSala?: boolean;
  SaleAbilitate?: CoopertoRoom[];
}

export interface CoopertoBookingSlot {
  Abilitato?: boolean;
  Orario?: string;
  MostraSconto?: boolean;
  TipoLabelSconto?: number;
  Sconto?: number;
  IconaSconto?: string;
  CodiceSconto?: string;
  MessaggioSconto?: string;
  IDStatoPrenotazioneDefault?: number;
  SlotOltreMezzanotte?: boolean;
}

export interface CoopertoBookingBand {
  CodiceFascia?: string;
  Etichetta?: string;
  TipoFascia?: string;
  MinutiPermanenza?: number;
  Avviso?: string;
  MostraFlagPresaVisioneAvviso?: boolean;
  Slots?: CoopertoBookingSlot[];
}

export interface CoopertoBookingDay {
  Data?: string;
  MessaggioOrariNonDisponibili?: string;
  BloccoPerEvento?: boolean;
  RedirectPerEvento?: boolean;
  LinkRedirectEvento?: string;
  FasceOrarie?: CoopertoBookingBand[];
}

export interface CoopertoCreateReservationRequest {
  CodiceSede: string;
  DataPrenotazione: string;
  CodiceStato: number;
  Nome?: string;
  Cognome?: string;
  Telefono?: string;
  Email?: string;
  Pax: number;
  Note?: string;
  ConsensoPrivacy?: boolean;
  ConsensoMarketing?: boolean;
}

export interface CoopertoCreateQueueRequest {
  CodiceSede: string;
  Nome?: string;
  Cognome?: string;
  Telefono: string;
  Email?: string;
  Pax: number;
  Note?: string;
  ConsensoPrivacy?: boolean;
  ConsensoMarketing?: boolean;
}

export interface CoopertoCreateContactRequest {
  Nome?: string;
  Cognome?: string;
  Email?: string;
  Telefono?: string;
  DataDiNascita?: string;
  ConsensoMarketing?: boolean;
  SovrascriviDati?: boolean;
}

export interface CoopertoUpdateFidelityCardRequest {
  codiceContatto: string;
  codiceCard: string;
}

export interface CoopertoRegisterVisitRequest {
  codiceContatto: string;
  codiceSede: string;
  dataVisita: string;
}

export type CoopertoRegisterVisitResponse = Record<string, unknown> | null;

export interface RegisterVisitResponse {
  source: DataSource;
  visit: CoopertoRegisterVisitResponse;
  visitDate: string;
}

export interface CoopertoTable {
  CodiceTavolo?: string;
  NomeTavolo?: string;
}

export interface CoopertoReservation {
  DataCreazione?: string;
  DataPrenotazione?: string;
  Nome?: string;
  Cognome?: string;
  Telefono?: string;
  Email?: string;
  Pax?: number;
  Note?: string;
  MotivoRifiuto?: string;
  CodiceStato?: number;
  LabelStato?: string;
  CodicePrenotazione?: string;
  CodiceSede?: string;
  CodiceContatto?: string;
  CodiceModuloPrenotazione?: string;
  CodiceSala?: string;
  NomeSala?: string;
  Tavoli?: CoopertoTable[];
}

export interface UpcomingReservation {
  reservationCode?: string;
  email?: string;
  contactCode?: string;
  dateTime: string;
  pax?: number;
  roomName?: string;
  stateLabel: string;
}

export interface CoopertoWaitlistEntry {
  DataCoda?: string;
  DataCreazione?: string;
  Nome?: string;
  Cognome?: string;
  Telefono?: string;
  Email?: string;
  Pax?: number;
  Note?: string;
  CodiceCoda?: string;
  CodiceSede?: string;
  CodiceContatto?: string;
  LinkCoda?: string;
  MinutiAttesaMin?: number;
  MinutiAttesaMax?: number;
}

export interface CoopertoContact {
  Nome?: string;
  Cognome?: string;
  Email?: string;
  DataCreazione?: string;
  Telefono?: string;
  DataDiNascita?: string;
  Indirizzo?: string;
  Citta?: string;
  CAP?: string;
  Nazione?: string;
  ConsensoPrivacy?: number;
  DataConsensoPrivacy?: string;
  ConsensoMarketing?: number;
  DataConsensoMarketing?: string;
  Note?: string;
  NumeroVisite?: number;
  DataUltimaVisita?: string;
  Provincia?: string;
  CodiceCard?: string;
  CodiceCardAssegnata?: string;
  NomeCardAssegnata?: string;
  SaldoPuntiCard?: number;
  Disiscritto?: number;
  DataDisiscrizione?: string;
  CodiceContatto?: string;
  Tags?: string[];
}

export interface CoopertoCoupon {
  CodiceContatto?: string;
  DataCreazione?: string;
  DataScadenza?: string;
  DataUtilizzo?: string;
  CodiceCouponContatto?: string;
  Utilizzato?: boolean;
  CodiceCoupon?: string;
}

export interface CoopertoFidelityCard {
  Nome?: string;
  Livello?: number;
  CodiceCard?: string;
}

export interface CoopertoVenue {
  Nome?: string;
  CodiceSede?: string;
}

export interface CoopertoVenueHour {
  CodiceGiorno?: number;
  Giorno?: string;
  OraInizio?: string;
  OraFine?: string;
}

export interface CoopertoVenueException {
  Tipologia?: string;
  DataInizio?: string;
  DataFine?: string;
  MessaggioChiusura?: string;
}

export interface CoopertoVenueHours {
  Orari?: CoopertoVenueHour[];
  Eccezioni?: CoopertoVenueException[];
}

export interface BookingRoom {
  code: string;
  name: string;
  publicName?: string;
}

export interface BookingModule {
  code: string;
  name: string;
  type?: string;
  allowsRoomSelection: boolean;
  rooms: BookingRoom[];
}

export interface BookingSlot {
  time: string;
  enabled: boolean;
  statusCode: number;
  beyondMidnight: boolean;
  discount?: {
    amount?: number;
    labelType?: number;
    code?: string;
    icon?: string;
    message?: string;
  };
}

export interface BookingBand {
  code: string;
  label: string;
  type?: string;
  durationMinutes?: number;
  warning?: string;
  showWarningCheckbox: boolean;
  slots: BookingSlot[];
}

export interface BookingDay {
  date: string;
  unavailableMessage?: string;
  eventBlocked: boolean;
  redirectOnEvent: boolean;
  redirectUrl?: string;
  bands: BookingBand[];
}

export interface BookingBootstrapResponse {
  source: DataSource;
  module: BookingModule | null;
  rooms: BookingRoom[];
  defaultRoomCode?: string;
}

export interface BookingAvailabilityResponse {
  source: DataSource;
  date: string;
  pax: number;
  roomCode?: string;
  days: BookingDay[];
}

export interface BookingCreateInput {
  date: string;
  time: string;
  pax: number;
  roomCode?: string;
  statusCode?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  note?: string;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}

export interface BookingCreateResponse {
  source: DataSource;
  reservation: CoopertoReservation;
}

export interface WaitlistCreateInput {
  date: string;
  pax: number;
  roomCode?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  note?: string;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}

export interface WaitlistCreateResponse {
  source: DataSource;
  entry: CoopertoWaitlistEntry;
}

export interface ProfileResponse {
  source: DataSource;
  contact: CoopertoContact | null;
  points: number | null;
  coupons: CoopertoCoupon[];
  fidelityCards: CoopertoFidelityCard[];
  upcomingReservations: UpcomingReservation[];
  lookupMode: "email" | "contactCode";
  query: string;
}

export interface FidelityActivationResponse {
  source: DataSource;
  status: "activated" | "already_active";
  cardCode: string;
  profile: ProfileResponse;
}

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string;
  marketingConsent?: boolean;
}

export interface VenueResponse {
  source: DataSource;
  venues: Array<
    CoopertoVenue & {
      isPrimary: boolean;
      hours?: CoopertoVenueHours | null;
    }
  >;
}
