"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  getAppSection,
  trackAppEvent,
  trackAppPageView,
} from "@/lib/analytics";

const appOpenSessionKey = "tortuga.analytics.app-open";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    if (!pathname || lastTrackedPathRef.current === pathname) {
      return;
    }

    lastTrackedPathRef.current = pathname;
    trackAppPageView(pathname);

    try {
      if (!window.sessionStorage.getItem(appOpenSessionKey)) {
        window.sessionStorage.setItem(appOpenSessionKey, "1");
        trackAppEvent("app_open", {
          app_section: getAppSection(pathname),
        });
      }
    } catch {
      trackAppEvent("app_open", {
        app_section: getAppSection(pathname),
      });
    }
  }, [pathname]);

  return null;
}
