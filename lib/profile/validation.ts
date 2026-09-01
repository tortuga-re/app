import type { ProfileUpdateInput } from "@/lib/cooperto/types";
import {
  italianPhoneValidationError,
  isValidItalianPhone,
  normalizeItalianPhone,
} from "@/lib/validation/phone";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (source: Record<string, unknown>, key: string) => {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
};

export const normalizeProfileEmail = (value?: string) =>
  value?.trim().toLowerCase() ?? "";

export const isValidProfileEmail = (value?: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeProfileEmail(value));

/**
 * Validazione severa per Nickname e Input utente:
 * - Solo lettere (a-z, A-Z), numeri (0-9), trattini (-) e spazi
 * - Lunghezza massima 24 caratteri (minimo 2)
 * - Nessun simbolo o tag HTML (previene XSS e iniezione)
 */
export const isValidStrictNickname = (value?: string): boolean => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 24) return false;
  return /^[a-zA-Z0-9\s-]+$/.test(trimmed);
};

export const isValidItalianMobileNumber = (value?: string) =>
  isValidItalianPhone(value ?? "");

export const normalizePhoneNumber = (value?: string) =>
  normalizeItalianPhone(value ?? "")?.normalizedE164 ?? "";

export const normalizeItalianMobileForCooperto = (value?: string) =>
  normalizeItalianPhone(value ?? "")?.nationalNumber ?? "";

export const normalizeProfileUpdateInput = (
  payload: unknown,
): ProfileUpdateInput => {
  const source = isRecord(payload) ? payload : {};
  const birthDate = readString(source, "birthDate");

  return {
    firstName: readString(source, "firstName"),
    lastName: readString(source, "lastName"),
    phone: normalizePhoneNumber(readString(source, "phone")),
    email: normalizeProfileEmail(readString(source, "email")),
    ...(birthDate ? { birthDate } : {}),
    marketingConsent: source.marketingConsent === true,
  };
};

export const validateProfileUpdateInput = (
  payload: ProfileUpdateInput,
): string | null => {
  if (!payload.firstName.trim() || !payload.lastName.trim()) {
    return "Inserisci nome e cognome.";
  }

  if (!payload.email || !isValidProfileEmail(payload.email)) {
    return "Inserisci un indirizzo email valido.";
  }

  if (payload.phone && !isValidItalianMobileNumber(payload.phone)) {
    return italianPhoneValidationError;
  }

  if (payload.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)) {
    return "La data di nascita non e valida.";
  }

  return null;
};
