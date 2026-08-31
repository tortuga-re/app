import "server-only";

import {
  describePushDevice,
  getCurrentVapidKeyVersion,
  getEndpointFingerprint,
} from "@/lib/push/metadata";
import { listPushSubscriptions } from "@/lib/push/subscription-store";
import type { PushDiagnosticsResponse } from "@/lib/push/types";

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";

export const getPushDiagnostics = async (
  requestedEmail: string,
): Promise<PushDiagnosticsResponse> => {
  const email = normalizeEmail(requestedEmail);
  const currentVapidKeyVersion = getCurrentVapidKeyVersion();
  const records = await listPushSubscriptions();

  const devices = records
    .filter((record) => normalizeEmail(record.email) === email)
    .map((record) => {
      const device = describePushDevice(record.userAgent);
      const platform = record.platform || device.platform;
      const browser = record.browser || device.browser;
      const isIos = platform === "iPhone / iPad" || device.isIos;
      const vapidKeyVersion = record.vapidKeyVersion || "";
      const vapidStatus = !vapidKeyVersion || !currentVapidKeyVersion
        ? "unknown" as const
        : vapidKeyVersion === currentVapidKeyVersion
          ? "current" as const
          : "outdated" as const;

      return {
        id: getEndpointFingerprint(record.endpoint),
        email: record.email,
        browser,
        platform,
        installed: Boolean(record.installed),
        standalone: Boolean(record.standalone ?? record.installed),
        permission: record.permission ?? "unknown" as const,
        vapidKeyVersion,
        vapidStatus,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        lastSeenAt: record.lastSeenAt,
        lastSuccessfulSendAt: record.lastSuccessfulSendAt,
        lastFailedSendAt: record.lastFailedSendAt,
        lastError: record.lastError,
        lastOpenedAt: record.lastOpenedAt,
        lastOpenedUrl: record.lastOpenedUrl,
        isIos,
        iosChecks: isIos
          ? {
              openedFromHome: Boolean(record.standalone ?? record.installed),
              permissionGranted: record.permission === "granted",
              subscriptionPresent: Boolean(
                record.endpoint && record.keys.auth && record.keys.p256dh,
              ),
              focusAndLowPowerMode: "manual-check-required" as const,
            }
          : undefined,
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    email,
    currentVapidKeyVersion,
    devices,
  };
};
