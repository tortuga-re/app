import "server-only";

import webpush from "web-push";

import {
  deletePushSubscription,
  listPushSubscriptions,
} from "@/lib/push/subscription-store";
import type {
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

export const sendPushNotification = async (
  payload: PushSendPayload,
): Promise<PushSendResponse> => {
  configureWebPush();

  const email = normalizeEmail(payload.email);
  const subscriptions = (await listPushSubscriptions()).filter((record) =>
    email ? normalizeEmail(record.email) === email : true,
  );
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
