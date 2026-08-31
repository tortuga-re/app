import "server-only";

import path from "node:path";

import { createPersistentJsonStore } from "@/lib/server/persistent-json-store";
import type {
  PushDeliveryTarget,
  PushHistoryResponseRecord,
  PushSendHistoryRecord,
} from "@/lib/push/types";

const HISTORY_LIMIT = 100;

const historyStore = createPersistentJsonStore<PushSendHistoryRecord[]>({
  key: "tortuga:push-send-history",
  localFile: path.join(".data", "push-send-history.json"),
  initialState: () => [],
  requireRedisInProduction: true,
});

const normalizeHistory = (records?: PushSendHistoryRecord[]) =>
  Array.isArray(records) ? records : [];

export const createPushHistory = async (record: PushSendHistoryRecord) => {
  await historyStore.update((current) =>
    [record, ...normalizeHistory(current).filter((item) => item.id !== record.id)].slice(
      0,
      HISTORY_LIMIT,
    ),
  );
};

export const completePushHistory = async (
  id: string,
  updates: Pick<
    PushSendHistoryRecord,
    "completedAt" | "sent" | "failed" | "removed" | "errors" | "targets"
  >,
) => {
  await historyStore.update((current) =>
    normalizeHistory(current).map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    ),
  );
};

export const listPushHistory = async (limit = 20): Promise<PushHistoryResponseRecord[]> =>
  normalizeHistory(await historyStore.read())
    .slice(0, Math.max(1, Math.min(limit, 100)));

export const markPushHistoryOpened = async (
  deliveryId: string,
  endpointFingerprint: string,
) => {
  if (!deliveryId.trim() || !endpointFingerprint.trim()) return null;

  let matchedTarget: PushDeliveryTarget | null = null;
  const openedAt = new Date().toISOString();

  await historyStore.update((current) =>
    normalizeHistory(current).map((record) => {
      if (record.id !== deliveryId) return record;
      let changed = false;
      const targets = record.targets.map((target) => {
        if (target.endpointFingerprint !== endpointFingerprint) return target;
        changed = true;
        matchedTarget = { ...target, openedAt };
        return matchedTarget;
      });
      return changed ? { ...record, targets } : record;
    }),
  );

  return matchedTarget;
};
