"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Home, Info, Users, Skull } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useBookingOverlay } from "@/components/booking-overlay";

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
    // Inserisce il pulsante Prenota con icona Skull al centro (indice 2, tra Gift e Ciurma)
    navItems.splice(2, 0, { href: "#prenota", label: "Prenota", Icon: Skull, isAction: true });
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
