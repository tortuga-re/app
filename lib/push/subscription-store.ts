import "server-only";

import path from "node:path";

import { pwaConfig } from "@/lib/config";
import { createPersistentJsonStore } from "@/lib/server/persistent-json-store";
import type {
  PushDeliveryError,
  SavePushSubscriptionInput,
  StoredPushSubscription,
} from "@/lib/push/types";
import {
  describePushDevice,
  getEndpointFingerprint,
  getCurrentVapidKeyVersion,
} from "@/lib/push/metadata";

const DEFAULT_SUBSCRIPTIONS_PATH = path.join(
  ".data",
  "push-subscriptions.json",
);

const DEFAULT_VISITS_PATH = path.join(
  ".data",
  "visit-storage.json",
);

const resolveSubscriptionsFile = () => {
  if (!pwaConfig.pushSubscriptionsFile) {
    return DEFAULT_SUBSCRIPTIONS_PATH;
  }

  return pwaConfig.pushSubscriptionsFile;
};

const subscriptionsStore = createPersistentJsonStore<StoredPushSubscription[]>({
  key: "tortuga:push-subscriptions",
  localFile: resolveSubscriptionsFile(),
  initialState: () => [],
  requireRedisInProduction: true,
});

const visitStore = createPersistentJsonStore<Record<string, StoredVisit[]>>({
  key: "tortuga:visits:index",
  localFile: DEFAULT_VISITS_PATH,
  initialState: () => ({}),
  requireRedisInProduction: true,
});

const normalizeSubscriptionRecords = (records?: StoredPushSubscription[]) =>
  Array.isArray(records) ? records : [];

export const listPushSubscriptions = async (): Promise<StoredPushSubscription[]> =>
  normalizeSubscriptionRecords(await subscriptionsStore.read());

export const savePushSubscription = async (
  input: SavePushSubscriptionInput,
): Promise<{ record: StoredPushSubscription; isNew: boolean }> => {
  const now = new Date().toISOString();
  const device = describePushDevice(input.userAgent);

  const nextRecord: StoredPushSubscription = {
    endpoint: input.subscription.endpoint,
    expirationTime: input.subscription.expirationTime ?? null,
    keys: {
      auth: input.subscription.keys?.auth ?? "",
      p256dh: input.subscription.keys?.p256dh ?? "",
    },
    email: input.email?.trim().toLowerCase() || undefined,
    permission: input.permission,
    userAgent: input.userAgent?.trim() || undefined,
    installed: Boolean(input.installed),
    standalone: Boolean(input.standalone ?? input.installed),
    platform: device.platform,
    browser: device.browser,
    vapidKeyVersion: getCurrentVapidKeyVersion() || undefined,
    venueAccessExpiresAt: input.venueAccessExpiresAt,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };

  let savedRecord = nextRecord;
  let isNew = false;

  await subscriptionsStore.update((currentRecords) => {
    const records = normalizeSubscriptionRecords(currentRecords);
    const existingIndex = records.findIndex(
      (record) => record.endpoint === nextRecord.endpoint,
    );

    isNew = existingIndex < 0;

    if (existingIndex >= 0) {
      const existingRecord = records[existingIndex];
      const mergedRecord = {
        ...existingRecord,
        ...nextRecord,
        createdAt: existingRecord.createdAt,
        updatedAt: now,
      };
      records[existingIndex] = mergedRecord;
      savedRecord = mergedRecord;
      return records;
    }

    records.push(nextRecord);
    savedRecord = nextRecord;
    return records;
  });

  return { record: savedRecord, isNew };
};

export const deletePushSubscription = async (endpoint: string) => {
  const normalizedEndpoint = endpoint.trim();

  if (!normalizedEndpoint) {
    return false;
  }

  let removed = false;

  await subscriptionsStore.update((currentRecords) => {
    const records = normalizeSubscriptionRecords(currentRecords);
    const nextRecords = records.filter(
      (record) => record.endpoint !== normalizedEndpoint,
    );
    removed = nextRecords.length !== records.length;
    return nextRecords;
  });

  return removed;
};

export const markPushSubscriptionDelivery = async (
  endpoint: string,
  result:
    | { success: true; at?: string }
    | { success: false; error: PushDeliveryError; at?: string },
) => markPushSubscriptionDeliveries([{ endpoint, result }]);

export const markPushSubscriptionDeliveries = async (
  deliveries: Array<{
    endpoint: string;
    result:
      | { success: true; at?: string }
      | { success: false; error: PushDeliveryError; at?: string };
  }>,
) => {
  const deliveryByEndpoint = new Map(
    deliveries
      .filter((delivery) => delivery.endpoint.trim())
      .map((delivery) => [delivery.endpoint.trim(), delivery.result]),
  );
  if (!deliveryByEndpoint.size) return;

  await subscriptionsStore.update((currentRecords) =>
    normalizeSubscriptionRecords(currentRecords).map((record) => {
      const delivery = deliveryByEndpoint.get(record.endpoint);
      if (!delivery) return record;
      const at = delivery.at ?? new Date().toISOString();
      if (delivery.success) {
        return {
          ...record,
          lastSuccessfulSendAt: at,
          lastError: undefined,
        };
      }
      return {
        ...record,
        lastFailedSendAt: at,
        lastError: delivery.error,
      };
    }),
  );
};

export const markPushSubscriptionOpened = async (
  endpointFingerprint: string,
  url?: string,
) => {
  const openedAt = new Date().toISOString();

  await subscriptionsStore.update((currentRecords) =>
    normalizeSubscriptionRecords(currentRecords).map((record) =>
      getEndpointFingerprint(record.endpoint) === endpointFingerprint
        ? {
            ...record,
            lastOpenedAt: openedAt,
            lastOpenedUrl: url?.trim() || undefined,
          }
        : record,
    ),
  );
};

export interface StoredVisit {
  contactCode: string;
  email?: string;
  timestamp: string;
  surveySent: boolean;
}

const normalizeVisitStore = (store?: Record<string, StoredVisit[]>) => store ?? {};

export const saveVisitToStorage = async (contactCode: string, email?: string) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    await visitStore.update((rawStore) => {
      const store = normalizeVisitStore(rawStore);
      const visits = [...(store[today] ?? [])];

      if (!visits.find((visit) => visit.contactCode === contactCode)) {
        visits.push({
          contactCode,
          email: email?.trim().toLowerCase(),
          timestamp: new Date().toISOString(),
          surveySent: false,
        });
      }

      store[today] = visits;
      return store;
    });
  } catch (error) {
    console.error("[Visit Storage] Errore salvataggio visita:", error);
  }
};

export const listVisitsForDate = async (dateIso: string): Promise<StoredVisit[]> => {
  const store = normalizeVisitStore(await visitStore.read());
  return store[dateIso] ?? [];
};

export const updateVisitSurveyStatus = async (
  dateIso: string,
  contactCode: string,
) => {
  try {
    await visitStore.update((rawStore) => {
      const store = normalizeVisitStore(rawStore);
      const visits = [...(store[dateIso] ?? [])];
      const index = visits.findIndex((visit) => visit.contactCode === contactCode);

      if (index >= 0) {
        visits[index] = {
          ...visits[index],
          surveySent: true,
        };
        store[dateIso] = visits;
      }

      return store;
    });
  } catch (error) {
    console.error("[Visit Storage] Errore update status:", error);
  }
};

export const isPushSubscriptionRedisConfigured = () =>
  subscriptionsStore.isRedisConfigured;
