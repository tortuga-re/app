export type ItalianPhoneNormalized = {
  normalizedE164: string;
  nationalNumber: string;
};

export const italianPhoneValidationError =
  "Inserisci un numero di cellulare italiano valido, es. 351 523 2389.";

const stripCommonPhoneSeparators = (input: string) =>
  input.trim().replace(/[\s().-]+/g, "");

const extractItalianMobileNationalNumber = (input: string) => {
  const compact = stripCommonPhoneSeparators(input);

  if (!compact) {
    return "";
  }

  if (/[^+\d]/.test(compact)) {
    return "";
  }

  if (compact.startsWith("+")) {
    if (!/^\+\d+$/.test(compact)) {
      return "";
    }
  } else if (!/^\d+$/.test(compact)) {
    return "";
  }

  const digitsOnly = compact.startsWith("+") ? compact.slice(1) : compact;

  if (/^00393\d{9}$/.test(digitsOnly)) {
    return digitsOnly.slice(4);
  }

  if (/^393\d{9}$/.test(digitsOnly)) {
    return digitsOnly.slice(2);
  }

  if (/^3\d{9}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  return "";
};

export const normalizeItalianPhone = (
  input: string,
): ItalianPhoneNormalized | null => {
  const nationalNumber = extractItalianMobileNationalNumber(input);

  if (!nationalNumber) {
    return null;
  }

  return {
    normalizedE164: `+39${nationalNumber}`,
    nationalNumber,
  };
};

export const isValidItalianPhone = (input: string) =>
  Boolean(normalizeItalianPhone(input));

export const validateItalianPhone = (input: string) => {
  const normalized = normalizeItalianPhone(input);

  if (!normalized) {
    return {
      ok: false as const,
      error: italianPhoneValidationError,
    };
  }

  return {
    ok: true as const,
    normalizedE164: normalized.normalizedE164,
    nationalNumber: normalized.nationalNumber,
  };
};
