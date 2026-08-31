const base64UrlToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

const uint8ArrayToBase64Url = (value: Uint8Array) => {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const normalizeKey = (value: string) => value.trim().replace(/=+$/g, "");

export const isStandalonePwa = () => {
  const standaloneMatch =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return standaloneMatch || iosStandalone;
};

const subscriptionUsesKey = (
  subscription: PushSubscription,
  expectedPublicKey: string,
) => {
  const applicationServerKey = subscription.options.applicationServerKey;
  if (!applicationServerKey) return true;
  const actual = uint8ArrayToBase64Url(new Uint8Array(applicationServerKey));
  return normalizeKey(actual) === normalizeKey(expectedPublicKey);
};

export const ensureCurrentPushSubscription = async (
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
) => {
  let subscription = await registration.pushManager
    .getSubscription()
    .catch(() => null);

  const isExpired = Boolean(
    subscription?.expirationTime && subscription.expirationTime <= Date.now(),
  );
  const usesCurrentKey = subscription
    ? subscriptionUsesKey(subscription, vapidPublicKey)
    : true;

  if (subscription && (isExpired || !usesCurrentKey)) {
    await subscription.unsubscribe().catch(() => false);
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    });
  }

  return subscription;
};
