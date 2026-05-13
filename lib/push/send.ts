import "server-only";

import webpush from "web-push";

import type { ProfileResponse } from "@/lib/cooperto/types";
import {
  getBirthdayInsight,
  getCustomerRecencyInsight,
  getProfilePoints,
} from "@/lib/customer-profile";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import { getProfileData } from "@/lib/cooperto/service";
import {
  deletePushSubscription,
  listPushSubscriptions,
} from "@/lib/push/subscription-store";
import type {
  PushAudienceSegment,
  PushSendPayload,
  PushSendResponse,
  StoredPushSubscription,
} from "@/lib/push/types";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
const vapidSubject =
  process.env.VAPID_SUBJECT?.trim() || "mailto:noreply@tortugabay.it";

const configureWebPush = () => {
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error(
      "Configura NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY per inviare push.",
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
};

const toWebPushSubscription = (record: StoredPushSubscription) => ({
  endpoint: record.endpoint,
  expirationTime: record.expirationTime ?? null,
  keys: {
    auth: record.keys.auth,
    p256dh: record.keys.p256dh,
  },
});

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";

const shouldLoadProfilesForSegment = (segment?: PushAudienceSegment) =>
  segment === "recent_visitors_30d" ||
  segment === "birthday_soon_14d" ||
  segment === "vip_inactive_60d" ||
  segment === "identified_customers";

const loadProfileCache = async (emails: string[]) => {
  const uniqueEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  const entries = await Promise.all(
    uniqueEmails.map(async (email) => {
      try {
        const profile = await getProfileData("email", email);
        return [email, profile] as const;
      } catch {
        return [email, null] as const;
      }
    }),
  );

  return new Map<string, ProfileResponse | null>(entries);
};

const matchesSegment = ({
  record,
  payload,
  now,
  profile,
}: {
  record: StoredPushSubscription;
  payload: PushSendPayload;
  now: number;
  profile?: ProfileResponse | null;
}) => {
  const segment = payload.segment ?? "all";

  if (payload.onlyVenuePresent || segment === "venue_present") {
    return Boolean(
      record.venueAccessExpiresAt && record.venueAccessExpiresAt > now,
    );
  }

  if (segment === "installed_app") {
    return Boolean(record.installed);
  }

  if (segment === "identified_customers") {
    return Boolean(profile?.contact?.CodiceContatto || record.email);
  }

  if (segment === "recent_visitors_30d") {
    const rewardProgress = getFidelityRewardProgress(getProfilePoints(profile ?? null));
    const recency = getCustomerRecencyInsight(profile?.contact, rewardProgress);
    return recency?.status === "recent";
  }

  if (segment === "birthday_soon_14d") {
    return Boolean(getBirthdayInsight(profile?.contact?.DataDiNascita, 14));
  }

  if (segment === "vip_inactive_60d") {
    const rewardProgress = getFidelityRewardProgress(getProfilePoints(profile ?? null));
    const recency = getCustomerRecencyInsight(profile?.contact, rewardProgress);
    return recency?.status === "vip-inactive";
  }

  return true;
};

const buildPayload = (payload: PushSendPayload) =>
  JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/ciurma",
    tag: payload.tag || "tortuga-update",
    icon: payload.icon || "/pwa-icon/192",
    badge: payload.badge || "/pwa-icon/192",
    renotify: Boolean(payload.renotify),
  });

export const sendPushToSubscription = async (
  record: StoredPushSubscription,
  payload: PushSendPayload,
): Promise<boolean> => {
  configureWebPush();
  const notificationPayload = buildPayload(payload);

  try {
    await webpush.sendNotification(
      toWebPushSubscription(record),
      notificationPayload,
    );
    return true;
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 0;

    if (statusCode === 404 || statusCode === 410) {
      await deletePushSubscription(record.endpoint);
    }
    return false;
  }
};

export const sendPushNotification = async (
  payload: PushSendPayload,
): Promise<PushSendResponse> => {
  configureWebPush();

  const email = normalizeEmail(payload.email);
  const now = Date.now();
  const allSubscriptions = await listPushSubscriptions();
  const profileCache = shouldLoadProfilesForSegment(payload.segment)
    ? await loadProfileCache(
        allSubscriptions
          .map((record) => record.email)
          .filter((value): value is string => Boolean(value)),
      )
    : new Map<string, ProfileResponse | null>();

  const subscriptions = allSubscriptions.filter((record) => {
    const normalizedRecordEmail = normalizeEmail(record.email);
    const emailMatch = email ? normalizedRecordEmail === email : true;
    if (!emailMatch) return false;

    const profile = normalizedRecordEmail
      ? profileCache.get(normalizedRecordEmail)
      : null;

    return matchesSegment({
      record,
      payload,
      now,
      profile,
    });
  });
  const notificationPayload = buildPayload(payload);

  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (record) => {
      try {
        await webpush.sendNotification(
          toWebPushSubscription(record),
          notificationPayload,
        );
        sent += 1;
      } catch (error) {
        failed += 1;

        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          const deleted = await deletePushSubscription(record.endpoint);
          if (deleted) {
            removed += 1;
          }
        }
      }
    }),
  );

  return {
    sent,
    failed,
    removed,
    total: subscriptions.length,
  };
};
