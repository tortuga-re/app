"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Info, LayoutDashboard, Sparkles, Users } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useBookingOverlay } from "@/components/booking-overlay";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { isAdmin } from "@/lib/admin/identity";

// Icona personalizzata: Teschio con ossa incrociate (Jolly Roger)
function SkullCrossbones({ size = 21, strokeWidth = 1.7 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Ossa incrociate (che partono dall'esterno del teschio) */}
      <path d="M9 9L4 4" />
      <circle cx="3.5" cy="4.5" r="0.8" fill="currentColor" />
      <circle cx="4.5" cy="3.5" r="0.8" fill="currentColor" />

      <path d="M15 9l5-5" />
      <circle cx="20.5" cy="4.5" r="0.8" fill="currentColor" />
      <circle cx="19.5" cy="3.5" r="0.8" fill="currentColor" />

      <path d="M9 15l-5 5" />
      <circle cx="3.5" cy="19.5" r="0.8" fill="currentColor" />
      <circle cx="4.5" cy="20.5" r="0.8" fill="currentColor" />

      <path d="M15 15l5 5" />
      <circle cx="20.5" cy="19.5" r="0.8" fill="currentColor" />
      <circle cx="19.5" cy="20.5" r="0.8" fill="currentColor" />

      {/* Teschio al centro */}
      <path d="M12 5a4.5 4.5 0 0 0-4.5 4.5v1.5a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V9.5A4.5 4.5 0 0 0 12 5z" fill="#fffdf8" />
      <path d="M10 13v2.5a0.5 0 0 0 0.5 0.5h3a0.5 0 0 0 0.5-0.5V13" fill="#fffdf8" />
      
      {/* Occhi */}
      <circle cx="10" cy="9.5" r="1" fill="currentColor" />
      <circle cx="14" cy="9.5" r="1" fill="currentColor" />
      
      {/* Naso */}
      <path d="M12 11.5v-0.5" />
      
      {/* Denti */}
      <path d="M11 15.5v1" />
      <path d="M12 15.5v1" />
      <path d="M13 15.5v1" />
    </svg>
  );
}

function LivePulseDotIcon() {
  return (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center my-0.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
    </span>
  );
}

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  isAction?: boolean;
  isLive?: boolean;
}

const baseItems: NavItem[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/classifiche", label: "Classifiche", Icon: BarChart3 },
  { href: "/ciurma", label: "Ciurma", Icon: Users },
  { href: "/info", label: "Info", Icon: Info },
];

export function BottomNav({ isVip = false }: { isVip?: boolean }) {
  const pathname = usePathname();
  const { openBooking, showBookingButton, bookingCtaRef } = useBookingOverlay();
  const { scenario } = useDemoScenario();
  const { hasAccess } = useOnPremiseAccess();
  const { identity } = useCustomerIdentity();
  const isOnPremise = scenario.enabled ? scenario.onPremise : hasAccess;
  const isAdministrator = isAdmin(identity.email) || (scenario.enabled && scenario.demoAdmin);
  const showCenterAction = isAdministrator || isOnPremise || showBookingButton;

  const navItems = [...baseItems];
  if (isAdministrator) {
    navItems.splice(2, 0, { href: "/admin", label: "Plancia", Icon: LayoutDashboard });
  } else if (isOnPremise) {
    navItems.splice(2, 0, { href: "/stasera", label: "LIVE", Icon: LivePulseDotIcon, isLive: true });
  } else if (showBookingButton) {
    // Inserisce il pulsante Prenota con icona SkullCrossbones al centro.
    navItems.splice(2, 0, { href: "#prenota", label: "Prenota", Icon: SkullCrossbones, isAction: true });
  }

  return <div className="app-bottom-nav pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3">
    <nav className={cn(
      "minimal-bottom-nav pointer-events-auto grid w-full max-w-md px-2 py-2",
      showCenterAction ? "grid-cols-5" : "grid-cols-4"
    )}>
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href === "/admin" && pathname.startsWith("/admin/"));
        const Icon = item.Icon;
        const isLiveItem = 'isLive' in item && item.isLive;

        if ('isAction' in item && item.isAction) {
          return <button
            ref={bookingCtaRef}
            key={item.label}
            type="button"
            onClick={() => {
              triggerHaptic();
              openBooking();
            }}
            className="minimal-nav-item"
          >
            <Icon size={21} strokeWidth={1.7} /><span>{item.label}</span>
          </button>;
        }

        return <Link
          key={item.href}
          href={item.href}
          prefetch
          onClick={() => triggerHaptic()}
          className={cn(
            "minimal-nav-item",
            active && "active",
            item.href === "/ciurma" && isVip && "vip",
            isLiveItem && "!text-red-500 font-extrabold"
          )}
        >
          <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
          <span className={cn(isLiveItem ? "!text-red-500 font-black tracking-wider" : "")}>
            {item.label}
          </span>
        </Link>;
      })}
    </nav>
  </div>;
}
