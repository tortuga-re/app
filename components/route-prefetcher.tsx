"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CORE_ROUTES = ["/", "/ciurma", "/gift", "/info"];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      CORE_ROUTES.forEach((route) => router.prefetch(route));
    }, 1_200);

    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
