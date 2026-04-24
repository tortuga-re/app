"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  {
    href: "/prenota",
    label: "Prenota",
    icon: (
      <path
        d="M5.75 4.75h12.5a1 1 0 0 1 1 1v9.5a3 3 0 0 1-3 3H7.75a3 3 0 0 1-3-3v-9.5a1 1 0 0 1 1-1Zm0 3.5h13.5M8.25 3.5v2.5m7.5-2.5v2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
  },
  {
    href: "/profilo",
    label: "Profilo",
    icon: (
      <path
        d="M12 11.25a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.75 7a6.75 6.75 0 0 1 13.5 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
  },
  {
    href: "/sedi",
    label: "Info e Serate",
    icon: (
      <path
        d="M4.75 18.25h14.5M7 18.25V8.75a1 1 0 0 1 .56-.9L12 5.75l4.44 2.1a1 1 0 0 1 .56.9v9.5m-7.5-8.5h5M10 11.75h1m3 0h1m-5 3h1m3 0h1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <nav className="pointer-events-auto panel flex w-full max-w-md flex-col gap-3 rounded-[2.1rem] px-3 pb-3 pt-3">
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[1.35rem] border px-3 py-3 text-[9px] font-semibold uppercase leading-tight tracking-[0.18em] transition",
                  isActive
                    ? "border-[rgba(122,87,40,0.55)] bg-[linear-gradient(135deg,#f6ddb0_0%,#c38a46_52%,#7a5728_100%)] text-[#21170e] shadow-[0_12px_26px_rgba(181,138,77,0.3)]"
                    : "border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]",
                )}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={cn("h-5 w-5", isActive ? "text-[#21170e]" : "text-[var(--accent-strong)]")}
                >
                  {item.icon}
                </svg>
                <span className="text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-[rgba(255,216,156,0.1)] pt-2">
          <p className="px-3 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:rgba(240,211,154,0.7)]">
            EAT. DRINK. TORTUGA. REPEAT.
          </p>
        </div>
      </nav>
    </div>
  );
}
