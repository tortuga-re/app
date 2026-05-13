export type ItalianPhoneNormalized = {
  normalizedE164: string;
  nationalNumber: string;
};

export const italianPhoneValidationError =
  "Inserisci un numero di cellulare italiano valido, es. 351 523 2389.";

const stripCommonPhoneSeparators = (input: string) =>
  input.trim().replace(/[\s().-]+/g, "");

const extractItalianMobileNationalNumber = (input: string) => {
  let compact = stripCommonPhoneSeparators(input);

  if (!compact) {
    return "";
  }

  // Basic cleanup: remove leading + or 00
  if (compact.startsWith("+")) {
    compact = compact.slice(1);
  } else if (compact.startsWith("00")) {
    compact = compact.slice(2);
  }

  // Iteratively strip leading "39" as long as it's followed by something 
  // that looks like a 10-digit number starting with 3.
  // This handles multiple prefixes (e.g., users typing 39 inside a field 
  // that already has +39 prepended).
  let current = compact;
  
  // We check for length > 10 because Italian mobile numbers are 10 digits starting with 3.
  // If current is "393...", stripping "39" might reveal a valid 10-digit number.
  while (current.length > 10 && current.startsWith("39")) {
    const candidate = current.slice(2);
    // If the remainder is exactly 10 digits and starts with 3, we found it.
    if (candidate.length === 10 && candidate.startsWith("3")) {
      return candidate;
    }
    // If it's still too long, keep stripping 39 if it starts with another 39
    if (candidate.length > 10 && candidate.startsWith("39")) {
      current = candidate;
      continue;
    }
    // Otherwise, stop stripping
    break;
  }

  // If we ended up with exactly 10 digits starting with 3, great.
  if (current.length === 10 && current.startsWith("3")) {
    return current;
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
