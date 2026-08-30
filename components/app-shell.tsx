"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ScanLine, X } from "lucide-react";

import { AnalyticsTracker } from "@/components/analytics-tracker";
import { BottomNav } from "@/components/bottom-nav";
import { BookingOverlayProvider } from "@/components/booking-overlay";
import { DemoScenarioProvider, useDemoScenario } from "@/components/demo-scenario-provider";
import { PwaController } from "@/components/pwa-controller";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useCustomerStatus } from "@/lib/use-customer-status";
import { CustomerStatusProvider } from "@/components/customer-status-context";
import { QRScanner } from "@/components/QRScanner";
import { MenuOverlayProvider, useMenuOverlay } from "@/components/menu-overlay";
import { RoutePrefetcher } from "@/components/route-prefetcher";

const RECOVERY_KEY = "tortuga.chunk-recovery-at";
const RECOVERY_COOLDOWN_MS = 30_000;

const isChunkRecoveryError = (message: string) =>
  message.includes("Loading chunk") ||
  message.includes("Failed to fetch dynamically imported module") ||
  message.includes("ChunkLoadError") ||
  message.includes("unexpected token '<'") ||
  message.includes("Load failed") ||
  message.includes("404");

const recoverFromChunkError = async () => {
  if (typeof window === "undefined") {
    return false;
  }

  const lastRecovery = Number(sessionStorage.getItem(RECOVERY_KEY) ?? "0");
  const now = Date.now();

  if (now - lastRecovery < RECOVERY_COOLDOWN_MS) {
    return false;
  }

  sessionStorage.setItem(RECOVERY_KEY, String(now));

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Ignore cleanup failures and continue with reload.
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Ignore cache cleanup failures and continue with reload.
  }

  window.location.reload();
  return true;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { greeting, identity } = useCustomerIdentity();
  const customerStatus = useCustomerStatus(identity.email);

  const pathname = usePathname();
  const isStageOrAdmin = pathname.startsWith("/stage") || pathname.startsWith("/live") || pathname.startsWith("/admin/");

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      const message =
        e.error instanceof Error
          ? e.error.message
          : typeof e.message === "string"
            ? e.message
            : "";

      if (!isChunkRecoveryError(message)) {
        return;
      }

      void recoverFromChunkError();
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const message =
        e.reason instanceof Error
          ? e.reason.message
          : typeof e.reason === "string"
            ? e.reason
            : JSON.stringify(e.reason ?? "");

      if (!isChunkRecoveryError(message)) {
        return;
      }

      void recoverFromChunkError();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
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
    <CustomerStatusProvider value={customerStatus}>
    <DemoScenarioProvider>
    <MenuOverlayProvider>
      <BookingOverlayProvider>
    <div className="relative min-h-screen overflow-x-hidden">
      <AnalyticsTracker />
      <RoutePrefetcher />

      <div className="pointer-events-none absolute inset-0">
        <div className="fixed inset-0 z-[-1] bg-[#0a0a0a]">
          <Image
            src="/nautical-map.png"
            alt=""
            fill
            className="object-cover opacity-[0.12] mix-blend-multiply"
            priority
            quality={75}
          />
        </div>
        <div className="absolute inset-x-0 top-20 h-32 bg-[linear-gradient(180deg,rgba(216,176,106,0.06),transparent)]" />
      </div>

      <div className="app-shell-content relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-5">
        {pathname === "/" && (
          <AppHeader firstName={identity.firstName} fallbackGreeting={greeting} />
        )}
        {pathname === "/stasera" && <SectionHeader title="Cose da fare stasera" />}
        {pathname === "/ciurma" && <SectionHeader title="La tua Ciurma" />}
        {pathname === "/classifiche" && <SectionHeader title="Classifiche" />}
        {pathname === "/gift" && <SectionHeader title="Gift card" />}
        {pathname === "/info" && <SectionHeader title="Info Tortuga" />}

        <div className="flex flex-1 flex-col gap-5">
          <PwaController />

          <main className="flex-1">
            <div className="space-y-5">{children}</div>
          </main>
        </div>
      </div>

      <BottomNav isVip={customerStatus.isVip} />
    </div>
    </BookingOverlayProvider>
    </MenuOverlayProvider>
    </DemoScenarioProvider>
    </CustomerStatusProvider>
  );
}

function AppHeader({ firstName, fallbackGreeting }: { firstName: string; fallbackGreeting: string }) {
  const { scenario } = useDemoScenario();
  const name = scenario.enabled && scenario.loggedIn ? "Andrea" : firstName;
  const title = name ? `Ciao, ${name}` : fallbackGreeting.toLowerCase().replace(/^ciao/, "Ciao");
  return <header className="minimal-app-header">
    <Link href="/"><h1>{title}</h1><span /></Link>
    <HeaderScannerButton />
  </header>;
}

function HeaderScannerButton() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const { openMenu } = useMenuOverlay();
  return <>
    <button type="button" className="header-scan-button" onClick={() => setScannerOpen(true)} aria-label="Scansiona QR del locale"><ScanLine /></button>
    {scannerOpen ? <div className="header-scanner-overlay" role="dialog" aria-modal="true" aria-labelledby="header-scanner-title">
      <div className="header-scanner-card">
        <header><div><p className="minimal-eyebrow">Check-in Tortuga</p><h2 id="header-scanner-title">Scansiona il QR del tavolo</h2></div><button onClick={() => setScannerOpen(false)} aria-label="Chiudi scanner"><X /></button></header>
        <p>Punta la fotocamera sul codice presente nel locale per abilitare il menu.</p>
        <QRScanner onSuccess={() => { setScannerOpen(false); openMenu(); }} onCancel={() => setScannerOpen(false)} />
      </div>
    </div> : null}
  </>;
}

function SectionHeader({ title }: { title: string }) {
  return <header className="minimal-app-header section"><div><h1>{title}</h1><span /></div><HeaderScannerButton /></header>;
}
