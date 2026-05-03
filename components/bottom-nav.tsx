"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    label: "Home",
    icon: (
      <>
        {/* Compass Icon */}
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 3v2.5M12 18.5v2.5M3 12h2.5M18.5 12h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 7l2 5-2 5-2-5 2-5z" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="none" stroke="currentColor" strokeWidth="1" />
      </>
    ),
  },
  {
    href: "/prenota",
    label: "Prenota",
    icon: (
      <>
        {/* Map Icon */}
        <path d="M4 6l5.5-2.5 5 2 5.5-2.5v13.5l-5.5 2.5-5-2-5.5 2.5V6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9.5 3.5v13.5M14.5 5.5v13.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        <path d="M17 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor" opacity="0.8" />
      </>
    ),
  },
  {
    href: "/ciurma",
    label: "Ciurma",
    icon: (
      <>
        {/* Elegant Skull Icon */}
        <path d="M12 4c-3.3 0-6 2.7-6 6 0 2.2 1.2 4.1 3 5.2V18c0 .6.4 1 1 1h4c.6 0 1-.4 1-1v-2.8c1.8-1.1 3-3 3-5.2 0-3.3-2.7-6-6-6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 10.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM14 10.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="currentColor" />
        <path d="M11 19v1M13 19v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/info",
    label: "Info",
    icon: (
      <>
        {/* Parchment Icon */}
        <path d="M6 4h10l3 3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M7 8h6M7 12h10M7 16h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M16 4v3h3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
];

export function BottomNav({ isVip = false }: { isVip?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="app-bottom-nav pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4">
      <nav className="pointer-events-auto panel flex w-full max-w-md flex-col gap-3 rounded-[1.85rem] px-3 pb-3 pt-3">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => triggerHaptic()}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-[1.05rem] border px-2 py-3 text-[8px] font-semibold uppercase leading-tight tracking-[0.16em] transition",
                  isActive
                    ? "active-tab-glow border-[rgba(214,172,94,0.48)] bg-[linear-gradient(145deg,#ead092_0%,#b98036_48%,#6b4219_100%)] text-[#21170e] shadow-[0_12px_28px_rgba(181,138,77,0.32),inset_0_1px_0_rgba(255,247,218,0.34)]"
                    : "border-[rgba(255,216,156,0.09)] bg-[linear-gradient(180deg,rgba(216,176,106,0.04),rgba(255,255,255,0.024))] text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                    isActive
                      ? "border-[rgba(54,32,12,0.2)] bg-[rgba(45,28,11,0.14)]"
                      : item.href === "/ciurma" && isVip
                        ? "border-[rgba(227,191,117,0.36)] bg-[rgba(227,191,117,0.1)]"
                        : "border-[rgba(216,176,106,0.12)] bg-[rgba(255,255,255,0.03)]",
                  )}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={cn(
                      "h-5 w-5",
                      isActive
                        ? "text-[#21170e]"
                        : item.href === "/ciurma" && isVip
                          ? "text-[#e3bf75]"
                          : "text-[var(--accent-strong)]",
                    )}
                  >
                    {item.icon}
                  </svg>
                </span>
                <span
                  className={cn(
                    "text-center",
                    isActive
                      ? "text-[#21170e]"
                      : item.href === "/ciurma" && isVip
                        ? "text-[#e3bf75]"
                        : "",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="tortuga-divider" />
        <div>
          <p className="px-3 text-center text-[10px] font-semibold tracking-[0.3em] text-[color:rgba(240,211,154,0.7)]">
            eat.drink.<span className="text-[#D8B06A]" style={{ textShadow: "0 0 10px rgba(216, 176, 106, 0.9), 0 0 20px rgba(216, 176, 106, 0.4)" }}>TORTUGA</span>.repeat.
          </p>
        </div>
      </nav>
    </div>
  );
}
