import type { ProfileUpdateInput } from "@/lib/cooperto/types";

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

export const normalizeProfileUpdateInput = (
  payload: unknown,
): ProfileUpdateInput => {
  const source = isRecord(payload) ? payload : {};
  const birthDate = readString(source, "birthDate");

  return {
    firstName: readString(source, "firstName"),
    lastName: readString(source, "lastName"),
    phone: readString(source, "phone"),
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

  if (!payload.phone.trim()) {
    return "Inserisci un numero di telefono valido.";
  }

  if (payload.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)) {
    return "La data di nascita non e valida.";
  }

  return null;
};
