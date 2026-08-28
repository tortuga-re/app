"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Home, Info, Users } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useBookingOverlay } from "@/components/booking-overlay";

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

interface NavItem {
  href: string;
  label: string;
  Icon: any;
  isAction?: boolean;
}

const baseItems: NavItem[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/gift", label: "Gift", Icon: Gift },
  { href: "/ciurma", label: "Ciurma", Icon: Users },
  { href: "/info", label: "Info", Icon: Info },
];

export function BottomNav({ isVip = false }: { isVip?: boolean }) {
  const pathname = usePathname();
  const { openBooking, showBookingButton } = useBookingOverlay();

  const navItems = [...baseItems];
  if (showBookingButton) {
    // Inserisce il pulsante Prenota con icona SkullCrossbones al centro (indice 2, tra Gift e Ciurma)
    navItems.splice(2, 0, { href: "#prenota", label: "Prenota", Icon: SkullCrossbones, isAction: true });
  }

  return <div className="app-bottom-nav pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3">
    <nav className={cn(
      "minimal-bottom-nav pointer-events-auto grid w-full max-w-md px-2 py-2",
      showBookingButton ? "grid-cols-5" : "grid-cols-4"
    )}>
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.Icon;

        if ('isAction' in item && item.isAction) {
          return <button
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

        return <Link key={item.href} href={item.href} onClick={() => triggerHaptic()} className={cn("minimal-nav-item", active && "active", item.href === "/ciurma" && isVip && "vip")}>
          <Icon size={21} strokeWidth={active ? 2.2 : 1.7} /><span>{item.label}</span>
        </Link>;
      })}
    </nav>
  </div>;
}
