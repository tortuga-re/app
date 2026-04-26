import { analyticsConfig, siteConfig } from "@/lib/config";

export type AppAnalyticsEventName =
  | "app_open"
  | "login_success"
  | "view_coupon"
  | "view_prenotazioni"
  | "start_booking"
  | "booking_request_submit"
  | "view_fidelity_qr"
  | "app_page_view";

export type AppAnalyticsPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
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

  if (path.startsWith("/game/sfida-capitano")) {
    return "sfida_capitano";
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
  const dataLayerPayload = cleanPayload({
    event: eventName,
    site_area: analyticsConfig.siteArea,
    app_name: siteConfig.appName,
    app_domain: analyticsConfig.appDomain,
    app_section: payload.app_section || getAppSection(pagePath),
    event_source: analyticsConfig.eventSource,
    page_path: pagePath,
    page_location: window.location.href,
    meta_pixel_id: analyticsConfig.metaPixelId,
    meta_event_name: metaEventNames[eventName] ?? eventName,
    ...payload,
  });

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(dataLayerPayload);
};

export const trackAppPageView = (pathname: string) => {
  trackAppEvent("app_page_view", {
    app_section: getAppSection(pathname),
    page_path: pathname,
    page_title: document.title,
  });
};
