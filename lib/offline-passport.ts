/**
 * useOfflinePassport
 *
 * Salva in localStorage i dati minimi del passaporto pirata
 * dopo ogni login riuscito, e li recupera quando l'utente è offline.
 *
 * Dati salvati: nome, cognome, codiceContatto, email, livello fedeltà.
 */

const STORAGE_KEY = "tortuga.offline-passport";

export type OfflinePassportData = {
  profileName: string;
  email: string;
  contactCode: string;
  loyaltyLabel: string;
  loyaltyPoints: number;
  savedAt: string;
};

export function saveOfflinePassport(data: OfflinePassportData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage non disponibile (es. Safari privato) — ignora silenziosamente
  }
}

export function loadOfflinePassport(): OfflinePassportData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflinePassportData;
  } catch {
    return null;
  }
}

export function clearOfflinePassport(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
