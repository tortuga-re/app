import type { BookingSlot } from "@/lib/cooperto/types";

export type BookingDraft = {
  date: string;
  pax: string;
  roomCode: string;
  isAfterDinner: boolean;
  childrenCount: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note: string;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
};

export type BookingFieldName =
  | "date"
  | "pax"
  | "selectedTime"
  | "childrenCount"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "privacyAccepted";

export type BookingFieldErrors = Partial<Record<BookingFieldName, string>>;

export type DecoratedSlot = BookingSlot & {
  bandLabel: string;
  date: string;
};
