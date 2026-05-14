"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { AnalyticsTracker } from "@/components/analytics-tracker";
import { AppGreeting } from "@/components/app-greeting";
import { BottomNav } from "@/components/bottom-nav";
import { PwaController } from "@/components/pwa-controller";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { triggerHaptic } from "@/lib/haptics";
import { useCustomerStatus } from "@/lib/use-customer-status";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { greeting, identity } = useCustomerIdentity();
  const customerStatus = useCustomerStatus(identity.email);

  const pathname = usePathname();
  const isStageOrAdmin = pathname.startsWith("/stage") || pathname.startsWith("/live") || pathname.startsWith("/admin/");

  // Global handler for ChunkLoadErrors (classic PWA issue after deploy)
  useEffect(() => {
    const handleError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const message = "message" in e ? e.message : String(e.reason);
      if (
        message.includes("Loading chunk") || 
        message.includes("unexpected token '<'") ||
        message.includes("Load failed") ||
        message.includes("404")
      ) {
        console.warn("Rilevato errore di caricamento (cache vecchia). Ricarico...");
        window.location.reload();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleError);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleError);
    };
  }, []);

  if (isStageOrAdmin) {
    return (
      <div className="relative min-h-screen w-full bg-black">
        <AnalyticsTracker />
        <main className="w-full h-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AnalyticsTracker />

      <div className="pointer-events-none absolute inset-0">
        <div className="fixed inset-0 z-[-1] bg-[#0a0a0a]">
          <Image
            src="/nautical-map.png"
            alt=""
            fill
            className="object-cover opacity-50 mix-blend-screen"
            priority
            quality={60}
          />
        </div>
        <div className="absolute inset-x-0 top-20 h-32 bg-[linear-gradient(180deg,rgba(216,176,106,0.06),transparent)]" />
      </div>

      <div className="app-shell-content relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-5">
        {pathname === "/" && (
          <header className="mb-6">
            <div className="panel rounded-[2.15rem] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <Link href="/" className="min-w-0 flex-1">
                  <AppGreeting
                    greeting={greeting}
                    statusLabel={customerStatus.tierLabel}
                    points={customerStatus.points}
                  />
                </Link>

                <Link
                  href="/ciurma#riconoscimento"
                  className="rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)] transition hover:bg-[rgba(242,215,165,0.18)]"
                  onClick={() => triggerHaptic()}
                >
                  Ciurma
                </Link>
              </div>
            </div>
          </header>
        )}

        <div className="flex flex-1 flex-col gap-5">
          <PwaController />

          <main className="flex-1">
            <div className="space-y-5">{children}</div>
          </main>
        </div>
      </div>

      <BottomNav isVip={customerStatus.isVip} />
    </div>
  );
}
