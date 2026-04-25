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
        <path
          d="M12 3.75v3.2m0 10.1v3.2M4.95 12h3.2m7.7 0h3.2M6.35 6.35l2.2 2.2m6.9 6.9 2.2 2.2m-11.1 0 2.2-2.2m6.9-6.9 2.2-2.2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M12 6.1a5.9 5.9 0 1 1 0 11.8 5.9 5.9 0 0 1 0-11.8Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M10 14.7 14.9 9.8 13 16l-2.12-1.3L10 14.7Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </>
    ),
  },
  {
    href: "/prenota",
    label: "Prenota",
    icon: (
      <>
        <path
          d="M4.6 6.6 9.1 4.8l5.1 1.8 5.2-1.8v12.6l-5.2 1.8-5.1-1.8-4.5 1.8V6.6Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M9.1 4.8v12.8m5.1-11v12.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="m11.2 16.8 5.8-9.4 1.3 1.3-6.7 8.4-2.1.9.6-2.2 1.1 1Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </>
    ),
  },
  {
    href: "/ciurma",
    label: "Ciurma",
    icon: (
      <>
        <path
          d="M8 6.6c1.4-1.45 3.1-2.15 4-2.15 2.7 0 4.9 1.98 4.9 4.43 0 1.79-1.17 3.38-2.9 4.1V14.4c0 .62-.5 1.12-1.12 1.12h-1.76c-.62 0-1.12-.5-1.12-1.12v-1.42c-1.74-.72-2.9-2.3-2.9-4.1 0-.58.12-1.13.35-1.66Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M7.85 6.8h7.8c1.05 0 1.9.85 1.9 1.9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M10.15 9.65h.02m3.66 0h.02m-2.62 2.3c.3.26.58.38.8.38.22 0 .5-.12.8-.38M9.1 17.65l5.8 2.1m-5.8 0 5.8-2.1"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </>
    ),
  },
  {
    href: "/info",
    label: "Info",
    icon: (
      <>
        <path
          d="M9 4.8h6l2 2.7v7.1a3.6 3.6 0 0 1-3.6 3.6h-2.8A3.6 3.6 0 0 1 7 14.6V7.5L9 4.8Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M9.1 7.8h5.8m-6 3.1h6.2m-5.2 5.2h4.2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M11 18.2v1.3m2 0v-1.3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </>
    ),
  },
];

export function BottomNav({ isVip = false }: { isVip?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="app-bottom-nav pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4">
      <nav className="pointer-events-auto panel flex w-full max-w-md flex-col gap-3 rounded-[2.1rem] px-3 pb-3 pt-3">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => triggerHaptic()}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-[1.25rem] border px-2 py-3 text-[8px] font-semibold uppercase leading-tight tracking-[0.16em] transition",
                  isActive
                    ? "border-[rgba(122,87,40,0.55)] bg-[linear-gradient(135deg,#f6ddb0_0%,#c38a46_52%,#7a5728_100%)] text-[#21170e] shadow-[0_12px_26px_rgba(181,138,77,0.3)]"
                    : "border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]",
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
