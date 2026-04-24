"use client";

import { useCallback } from "react";

import { storageKeys } from "@/lib/config";
import {
  removeLocalStorageValue,
  useHydratedLocalStorageState,
} from "@/lib/local-storage-state";

export type CustomerIdentity = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingConsent?: boolean;
};

const emptyCustomerIdentity: CustomerIdentity = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  marketingConsent: undefined,
};

const cleanText = (value?: string) => value?.trim() ?? "";

export const normalizeCustomerEmail = (value?: string) =>
  cleanText(value).toLowerCase();

export const isValidCustomerEmail = (value?: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeCustomerEmail(value));

const parseStoredCustomerIdentity = (raw: string): CustomerIdentity | null => {
  const parsed = JSON.parse(raw) as Partial<CustomerIdentity>;

  return {
    email:
      typeof parsed.email === "string" ? normalizeCustomerEmail(parsed.email) : "",
    firstName: typeof parsed.firstName === "string" ? cleanText(parsed.firstName) : "",
    lastName: typeof parsed.lastName === "string" ? cleanText(parsed.lastName) : "",
    phone: typeof parsed.phone === "string" ? cleanText(parsed.phone) : "",
    marketingConsent:
      typeof parsed.marketingConsent === "boolean"
        ? parsed.marketingConsent
        : undefined,
  };
};

const mergeCustomerIdentity = (
  current: CustomerIdentity,
  updates: Partial<CustomerIdentity>,
): CustomerIdentity => ({
  email:
    updates.email !== undefined
      ? normalizeCustomerEmail(updates.email)
      : current.email,
  firstName:
    updates.firstName !== undefined
      ? cleanText(updates.firstName)
      : current.firstName,
  lastName:
    updates.lastName !== undefined ? cleanText(updates.lastName) : current.lastName,
  phone: updates.phone !== undefined ? cleanText(updates.phone) : current.phone,
  marketingConsent:
    updates.marketingConsent !== undefined
      ? updates.marketingConsent
      : current.marketingConsent,
});

export const getCustomerGreeting = (identity: CustomerIdentity) => {
  if (identity.firstName) {
    return `CIAO ${identity.firstName.toUpperCase()}`;
  }

  return identity.email ? "CIAO" : "CIAO OSPITE";
};

export function useCustomerIdentity() {
  const [identity, setIdentityState] = useHydratedLocalStorageState(
    storageKeys.customerIdentity,
    emptyCustomerIdentity,
    parseStoredCustomerIdentity,
  );

  const updateIdentity = useCallback(
    (updates: Partial<CustomerIdentity>) => {
      setIdentityState((current) => mergeCustomerIdentity(current, updates));
    },
    [setIdentityState],
  );

  const setIdentityFromEmail = useCallback(
    (email: string, extra?: Partial<Omit<CustomerIdentity, "email">>) => {
      const normalizedEmail = normalizeCustomerEmail(email);

      if (!isValidCustomerEmail(normalizedEmail)) {
        return false;
      }

      setIdentityState((current) =>
        mergeCustomerIdentity(current, {
          email: normalizedEmail,
          ...extra,
        }),
      );

      return true;
    },
    [setIdentityState],
  );

  const clearIdentity = useCallback(() => {
    removeLocalStorageValue(storageKeys.customerIdentity);
  }, []);

  const clearCustomerContext = useCallback(() => {
    removeLocalStorageValue(storageKeys.customerIdentity);
    removeLocalStorageValue(storageKeys.bookingDraft);
    removeLocalStorageValue(storageKeys.lastReservation);
    removeLocalStorageValue(storageKeys.profileLookup);
  }, []);

  return {
    identity,
    hasIdentity: Boolean(identity.email),
    greeting: getCustomerGreeting(identity),
    updateIdentity,
    setIdentityFromEmail,
    clearIdentity,
    clearCustomerContext,
  };
}
