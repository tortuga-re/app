"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Cruscotto" },
  { href: "/admin/live-tv", label: "Plancia" },
  { href: "/admin/buzzer", label: "Buzzer" },
  { href: "/admin/scontrini", label: "Scontrini" },
];

export function AdminTopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors",
              isActive
                ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-black"
                : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:border-[var(--accent-strong)]/40 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
