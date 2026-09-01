/**
 * Validazione dei numeri di tavolo autorizzati per i saluti in diretta TV al Tortuga:
 * - Da 10 a 18 (inclusi)
 * - Da 20 a 29 (inclusi)
 * - Da 30 a 37 (inclusi)
 * - Da 40 a 43 (inclusi)
 * - 50 e 51
 * - 60
 */
export const ALLOWED_TABLE_RANGES_DESCRIPTION =
  "Tavoli ammessi: da 10 a 18, da 20 a 29, da 30 a 37, da 40 a 43, 50, 51, 60.";

export const isValidTortugaTableNumber = (tableNum: unknown): boolean => {
  const num = typeof tableNum === "number" ? tableNum : parseInt(String(tableNum), 10);
  if (Number.isNaN(num) || !Number.isFinite(num)) return false;

  if (num >= 10 && num <= 18) return true;
  if (num >= 20 && num <= 29) return true;
  if (num >= 30 && num <= 37) return true;
  if (num >= 40 && num <= 43) return true;
  if (num === 50 || num === 51) return true;
  if (num === 60) return true;

  return false;
};

export const validateGreetingInput = (
  nickname: unknown,
  tableNumber: unknown,
): { valid: boolean; error?: string; cleanNickname?: string; cleanTableNumber?: number } => {
  if (typeof nickname !== "string" || !nickname.trim()) {
    return { valid: false, error: "Inserisci il tuo nome o nickname." };
  }

  const cleanNickname = nickname.trim();
  if (cleanNickname.length < 2 || cleanNickname.length > 24) {
    return { valid: false, error: "Il nome deve contenere da 2 a 24 caratteri." };
  }

  if (!/^[a-zA-Z0-9\s-]+$/.test(cleanNickname)) {
    return { valid: false, error: "Il nome può contenere solo lettere, numeri, spazi e trattini (-)." };
  }

  const num = typeof tableNumber === "number" ? tableNumber : parseInt(String(tableNumber), 10);
  if (!isValidTortugaTableNumber(num)) {
    return {
      valid: false,
      error: `Numero tavolo non valido. ${ALLOWED_TABLE_RANGES_DESCRIPTION}`,
    };
  }

  return {
    valid: true,
    cleanNickname,
    cleanTableNumber: num,
  };
};
