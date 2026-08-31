import type { BookingAvailabilityResponse } from "@/lib/cooperto/types";
import { normalizeCustomerEmail } from "@/lib/customer-identity";
import { formatLongDate, formatTime, todayIso } from "@/lib/utils";
import type { BookingDraft, DecoratedSlot } from "@/components/booking/types";

export const baseDraft: BookingDraft = { date: todayIso(), pax: "", roomCode: "", isAfterDinner: false, childrenCount: "", firstName: "", lastName: "", email: "", phone: "", note: "", privacyAccepted: true, marketingAccepted: true };
export const SALA_CENTRALE_ROOM_CODE = "da1d57f0-e0d5-4d7e-86be-9f8300f388b8";
export const AREA_FAMILY_ROOM_CODE = "2a2cda28-9466-4a9d-b2d0-5a0294b2fd0c";
export const fallbackWaitlistSlots = ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"];

export const parsePositiveInteger = (value: string) => {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const formatReservationDateLabel = (value?: string) => !value || Number.isNaN(Date.parse(value)) ? "" : formatLongDate(value);
export const formatReservationTimeLabel = (value?: string) => !value || Number.isNaN(Date.parse(value)) ? "" : formatTime(value);

export const buildDraftFallback = (firstName?: string, lastName?: string, email?: string, phone?: string, marketingConsent?: boolean): BookingDraft => {
  const rawPhone = (phone ?? "").replace(/\D/g, "");
  return { ...baseDraft, firstName: firstName?.trim() ?? "", lastName: lastName?.trim() ?? "", email: normalizeCustomerEmail(email), phone: rawPhone ? (rawPhone.startsWith("39") ? `+${rawPhone}` : `+39${rawPhone}`) : "", marketingAccepted: marketingConsent === true ? true : baseDraft.marketingAccepted };
};

const cleanText = (value?: string) => value ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
const isAfterDinnerBand = (label?: string, code?: string) => {
  const normalized = cleanText(`${label ?? ""} ${code ?? ""}`).toLowerCase();
  return normalized.includes("dopocena") || normalized.includes("dopo cena");
};

export const getVisibleBands = (availability: BookingAvailabilityResponse | null) => availability ? availability.days.map((day) => ({ ...day, bands: day.bands.filter((band) => !isAfterDinnerBand(band.label, band.code)) })) : [];
export const getVisibleSlots = (days: BookingAvailabilityResponse["days"], isAfterDinner?: boolean): DecoratedSlot[] => days.flatMap((day) => day.bands.flatMap((band) => band.slots.filter((slot) => !isAfterDinner || slot.time >= "22:30").map((slot) => ({ ...slot, bandLabel: band.label, date: day.date }))));
export const timeToMinutes = (time: string) => { const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10)); return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null; };

export const parseStoredDraft = (raw: string, fallback: BookingDraft, marketingConsent?: boolean): BookingDraft | null => {
  const parsed = JSON.parse(raw) as Partial<BookingDraft>;
  return {
    date: typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : fallback.date,
    pax: typeof parsed.pax === "string" ? parsed.pax : fallback.pax,
    roomCode: typeof parsed.roomCode === "string" ? parsed.roomCode : "",
    isAfterDinner: typeof parsed.isAfterDinner === "boolean" ? parsed.isAfterDinner : false,
    childrenCount: typeof parsed.childrenCount === "string" ? parsed.childrenCount : fallback.childrenCount,
    firstName: typeof parsed.firstName === "string" && parsed.firstName.trim() ? parsed.firstName : fallback.firstName,
    lastName: typeof parsed.lastName === "string" && parsed.lastName.trim() ? parsed.lastName : fallback.lastName,
    email: typeof parsed.email === "string" ? normalizeCustomerEmail(parsed.email) || fallback.email : fallback.email,
    phone: typeof parsed.phone === "string" ? parsed.phone : fallback.phone,
    note: typeof parsed.note === "string" ? parsed.note : "",
    privacyAccepted: typeof parsed.privacyAccepted === "boolean" ? parsed.privacyAccepted : fallback.privacyAccepted,
    marketingAccepted: marketingConsent === true ? true : typeof parsed.marketingAccepted === "boolean" ? parsed.marketingAccepted : fallback.marketingAccepted,
  };
};
