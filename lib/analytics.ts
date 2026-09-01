import { analyticsConfig, siteConfig } from "@/lib/config";

export type AppAnalyticsEventName =
  | "app_open"
  | "login_success"
  | "view_coupon"
  | "view_prenotazioni"
  | "start_booking"
  | "booking_request_submit"
  | "view_fidelity_qr"
  | "app_page_view"
  | "admin_console_view"
  | "admin_console_navigate"
  | "admin_push_sent"
  | "home_context_view"
  | "profile_loot_view"
  | "live_mode_view"
  | "match_drink_signup"
  | "match_drink_matches_calculated"
  | "match_drink_match_confirmed"
  | "match_drink_drink_redeemed"
  | "pirate_slot_played"
  | "pirate_slot_won";

export type AppAnalyticsPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (action: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

const metaEventNames: Partial<Record<AppAnalyticsEventName, string>> = {
  app_open: "AppOpen",
  login_success: "CompleteRegistration",
  view_coupon: "ViewContent",
  view_prenotazioni: "ViewContent",
  start_booking: "InitiateCheckout",
  booking_request_submit: "Lead",
  view_fidelity_qr: "ViewContent",
  app_page_view: "PageView",
  pirate_slot_played: "FindLocation",
  pirate_slot_won: "EarnReward",
};

const cleanPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

export const getAppSection = (pathname?: string) => {
  const path =
    pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "/");

  if (path === "/") {
    return "home";
  }

  if (path.startsWith("/prenota")) {
    return "prenota";
  }

  if (path.startsWith("/ciurma") || path.startsWith("/profilo")) {
    return "ciurma";
  }

  if (path.startsWith("/info") || path.startsWith("/sedi")) {
    return "info";
  }

  if (path.startsWith("/esperienze-locale")) {
    return "esperienze_locale";
  }

  return "app";
};

export const trackAppEvent = (
  eventName: AppAnalyticsEventName,
  payload: AppAnalyticsPayload = {},
) => {
  if (typeof window === "undefined") {
    return;
  }

  const pagePath = window.location.pathname;
  const metaEventName = metaEventNames[eventName] ?? eventName;
  const dataLayerPayload = cleanPayload({
    event: eventName,
    site_area: analyticsConfig.siteArea,
    app_name: siteConfig.appName,
    app_domain: analyticsConfig.appDomain,
    app_section: payload.app_section || getAppSection(pagePath),
    event_source: analyticsConfig.eventSource,
    page_path: pagePath,
    page_location: window.location.href,
    ga4_id: analyticsConfig.ga4Id,
    meta_pixel_id: analyticsConfig.metaPixelId,
    meta_event_name: metaEventName,
    ...payload,
  });

  // 1. Google Tag Manager & GA4 dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(dataLayerPayload);

  // 2. Meta Pixel Client-Side Event
  if (typeof window.fbq === "function") {
    try {
      window.fbq("track", metaEventName, cleanPayload(payload));
    } catch {
      // Suppress pixel error
    }
  }

  // 3. Meta Conversions API (CAPI) Server-Side Event
  void fetch("/api/tracking/meta-capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: metaEventName,
      eventSourceUrl: window.location.href,
      email: typeof payload.email === "string" ? payload.email : undefined,
      phone: typeof payload.phone === "string" ? payload.phone : undefined,
      firstName: typeof payload.firstName === "string" ? payload.firstName : undefined,
      lastName: typeof payload.lastName === "string" ? payload.lastName : undefined,
      customData: cleanPayload(payload),
    }),
  }).catch(() => undefined);
};

export const trackAppPageView = (pathname: string) => {
  trackAppEvent("app_page_view", {
    app_section: getAppSection(pathname),
    page_path: pathname,
    page_title: document.title,
  });
};
