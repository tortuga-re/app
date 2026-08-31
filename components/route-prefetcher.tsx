"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CORE_ROUTES = ["/", "/ciurma", "/gift", "/info"];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) {
      return;
    }

    const scheduledTimers: number[] = [];
    let idleId: number | null = null;
    let fallbackTimer: number | null = null;

    const prefetchRoutes = () => {
      CORE_ROUTES.forEach((route, index) => {
        scheduledTimers.push(
          window.setTimeout(() => router.prefetch(route), index * 350),
        );
      });
    };

    const scheduleDuringIdle = () => {
      const idleWindow = window as Window & {
        requestIdleCallback?: (
          callback: IdleRequestCallback,
          options?: IdleRequestOptions,
        ) => number;
      };

      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(prefetchRoutes, { timeout: 4_000 });
      } else {
        fallbackTimer = window.setTimeout(prefetchRoutes, 1_500);
      }
    };

    if (document.readyState === "complete") {
      scheduleDuringIdle();
    } else {
      window.addEventListener("load", scheduleDuringIdle, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleDuringIdle);
      scheduledTimers.forEach((timer) => window.clearTimeout(timer));
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [router]);

  return null;
}
