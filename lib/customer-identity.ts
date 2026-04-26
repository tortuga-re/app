"use client";

import { useCallback, useEffect } from "react";

import { storageKeys } from "@/lib/config";
import {
  removeLocalStorageValue,
  useHydratedLocalStorageState,
} from "@/lib/local-storage-state";
import type {
  CustomerSessionIdentity,
  CustomerSessionResponse,
} from "@/lib/session/types";

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

let customerSessionRestoreStarted = false;
let customerSessionRestorePromise: Promise<CustomerSessionIdentity | null> | null = null;
let lastPersistedCustomerSessionSignature = "";

const toCustomerSessionIdentity = (
  identity: CustomerIdentity,
): CustomerSessionIdentity | null => {
  const email = normalizeCustomerEmail(identity.email);

  if (!isValidCustomerEmail(email)) {
    return null;
  }

  return {
    email,
    firstName: cleanText(identity.firstName),
    lastName: cleanText(identity.lastName),
    phone: cleanText(identity.phone),
    marketingConsent: identity.marketingConsent,
  };
};

const persistCustomerSession = async (identity: CustomerIdentity) => {
  const sessionIdentity = toCustomerSessionIdentity(identity);

  if (!sessionIdentity) {
    return;
  }

  const signature = JSON.stringify(sessionIdentity);

  if (signature === lastPersistedCustomerSessionSignature) {
    return;
  }

  lastPersistedCustomerSessionSignature = signature;

  await fetch("/api/session/customer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionIdentity),
  }).catch(() => {
    lastPersistedCustomerSessionSignature = "";
  });
};

const restoreCustomerSession = () => {
  if (!customerSessionRestorePromise) {
    customerSessionRestorePromise = fetch("/api/session/customer", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const body = (await response.json()) as CustomerSessionResponse;
        return body.identity;
      })
      .catch(() => null);
  }

  return customerSessionRestorePromise;
};

const clearPersistedCustomerSession = async () => {
  lastPersistedCustomerSessionSignature = "";
  customerSessionRestorePromise = null;

  await fetch("/api/session/customer", {
    method: "DELETE",
  }).catch(() => undefined);
};

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

  useEffect(() => {
    if (customerSessionRestoreStarted) {
      return;
    }

    customerSessionRestoreStarted = true;
    let cancelled = false;

    void restoreCustomerSession().then((restoredIdentity) => {
      if (!restoredIdentity || cancelled) {
        return;
      }

      setIdentityState((current) => {
        if (current.email && current.email !== restoredIdentity.email) {
          return current;
        }

        return mergeCustomerIdentity(current, restoredIdentity);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [setIdentityState]);

  useEffect(() => {
    void persistCustomerSession(identity);
  }, [identity]);

  const updateIdentity = useCallback(
    (updates: Partial<CustomerIdentity>) => {
      const nextIdentity = mergeCustomerIdentity(identity, updates);
      setIdentityState(nextIdentity);
      void persistCustomerSession(nextIdentity);
    },
    [identity, setIdentityState],
  );

  const setIdentityFromEmail = useCallback(
    (email: string, extra?: Partial<Omit<CustomerIdentity, "email">>) => {
      const normalizedEmail = normalizeCustomerEmail(email);

      if (!isValidCustomerEmail(normalizedEmail)) {
        return false;
      }

      const nextIdentity = mergeCustomerIdentity(identity, {
        email: normalizedEmail,
        ...extra,
      });

      setIdentityState(nextIdentity);
      void persistCustomerSession(nextIdentity);

      return true;
    },
    [identity, setIdentityState],
  );

  const clearIdentity = useCallback(() => {
    removeLocalStorageValue(storageKeys.customerIdentity);
    void clearPersistedCustomerSession();
  }, []);

  const clearCustomerContext = useCallback(() => {
    removeLocalStorageValue(storageKeys.customerIdentity);
    removeLocalStorageValue(storageKeys.bookingDraft);
    removeLocalStorageValue(storageKeys.lastReservation);
    removeLocalStorageValue(storageKeys.profileLookup);
    void clearPersistedCustomerSession();
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
