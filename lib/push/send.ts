import "server-only";

import { randomUUID } from "node:crypto";

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
  markPushSubscriptionDelivery,
  markPushSubscriptionDeliveries,
} from "@/lib/push/subscription-store";
import {
  completePushHistory,
  createPushHistory,
} from "@/lib/push/history-store";
import {
  createPushTrackingToken,
  getEndpointFingerprint,
} from "@/lib/push/metadata";
import type {
  PushDeliveryTarget,
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

const buildPayload = (
  payload: PushSendPayload,
  tracking?: {
    deliveryId: string;
    endpointFingerprint: string;
  },
) =>
  JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/ciurma",
    tag: payload.tag || "tortuga-update",
    icon: payload.icon || "/pwa-icon/192",
    badge: payload.badge || "/pwa-icon/192",
    renotify: Boolean(payload.renotify),
    tracking: tracking
      ? {
          ...tracking,
          token: createPushTrackingToken(
            tracking.deliveryId,
            tracking.endpointFingerprint,
          ),
        }
      : undefined,
  });

const describePushError = (error: unknown) => {
  const details = typeof error === "object" && error !== null ? error : null;
  const statusCode = details && "statusCode" in details && typeof details.statusCode === "number" ? details.statusCode : 0;
  const message = error instanceof Error ? error.message : "Errore sconosciuto del servizio push.";
  const body = details && "body" in details && typeof details.body === "string" ? details.body.trim() : "";
  return {
    statusCode,
    message: (body || message).slice(0, 240),
  };
};

export const sendPushToSubscription = async (
  record: StoredPushSubscription,
  payload: PushSendPayload,
): Promise<boolean> => {
  configureWebPush();
  const deliveryId = randomUUID();
  const endpointFingerprint = getEndpointFingerprint(record.endpoint);
  const notificationPayload = buildPayload(payload, {
    deliveryId,
    endpointFingerprint,
  });

  try {
    await webpush.sendNotification(
      toWebPushSubscription(record),
      notificationPayload,
    );
    await markPushSubscriptionDelivery(record.endpoint, {
      success: true,
    }).catch(() => undefined);
    return true;
  } catch (error) {
    const failure = describePushError(error);

    await markPushSubscriptionDelivery(record.endpoint, {
      success: false,
      error: failure,
    }).catch(() => undefined);

    if (failure.statusCode === 404 || failure.statusCode === 410) {
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
  const historyId = randomUUID();
  const createdAt = new Date().toISOString();
  const pendingTargets: PushDeliveryTarget[] = subscriptions.map((record) => ({
    id: randomUUID(),
    endpointFingerprint: getEndpointFingerprint(record.endpoint),
    email: record.email,
    browser: record.browser,
    platform: record.platform,
    status: "pending",
  }));

  await createPushHistory({
    id: historyId,
    title: payload.title,
    body: payload.body,
    url: payload.url || "/ciurma",
    segment: payload.segment ?? "all",
    email: email || undefined,
    createdAt,
    sent: 0,
    failed: 0,
    removed: 0,
    total: subscriptions.length,
    errors: [],
    targets: pendingTargets,
  }).catch((error) => {
    console.error("[Push history] Creazione storico non riuscita:", error);
  });

  const targets = await Promise.all(
    subscriptions.map(async (record, index): Promise<PushDeliveryTarget> => {
      const target = pendingTargets[index];
      const notificationPayload = buildPayload(payload, {
        deliveryId: historyId,
        endpointFingerprint: target.endpointFingerprint,
      });

      try {
        await webpush.sendNotification(
          toWebPushSubscription(record),
          notificationPayload,
        );
        const acceptedAt = new Date().toISOString();
        return {
          ...target,
          status: "accepted",
          acceptedAt,
        };
      } catch (error) {
        const failure = describePushError(error);
        let removed = false;
        if (failure.statusCode === 404 || failure.statusCode === 410) {
          removed = await deletePushSubscription(record.endpoint);
        }

        return {
          ...target,
          status: "failed",
          statusCode: failure.statusCode,
          error: failure.message,
          removed,
        };
      }
    }),
  );

  const sent = targets.filter((target) => target.status === "accepted").length;
  const failed = targets.filter((target) => target.status === "failed").length;
  const removed = targets.filter((target) => target.removed).length;
  const errors = targets.reduce<PushSendResponse["errors"]>((items, target) => {
    if (target.status !== "failed" || !target.error) return items;
    const failure = {
      statusCode: target.statusCode ?? 0,
      message: target.error,
    };
    if (
      !items.some(
        (item) =>
          item.statusCode === failure.statusCode && item.message === failure.message,
      )
    ) {
      items.push(failure);
    }
    return items;
  }, []);

  await markPushSubscriptionDeliveries(
    targets.map((target, index) => ({
      endpoint: subscriptions[index].endpoint,
      result:
        target.status === "accepted"
          ? { success: true as const, at: target.acceptedAt }
          : {
              success: false as const,
              error: {
                statusCode: target.statusCode ?? 0,
                message: target.error || "Errore push non specificato.",
              },
            },
    })),
  ).catch(() => undefined);

  await completePushHistory(historyId, {
    completedAt: new Date().toISOString(),
    sent,
    failed,
    removed,
    errors,
    targets,
  }).catch((error) => {
    console.error("[Push history] Completamento storico non riuscito:", error);
  });

  return {
    historyId,
    sent,
    failed,
    removed,
    total: subscriptions.length,
    errors,
  };
};
