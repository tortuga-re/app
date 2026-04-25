"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    label: "Home",
    icon: (
      <>
        <path
          d="M12 4.5v8.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M12 5.25 8.25 9.5H12"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M12 6.25 16.25 10.75H12"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M6 14.5h12l-1.35 2.75H7.35L6 14.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M4.5 18c1-.67 2-.99 3-.99s2 .32 3 .99c1-.67 2-.99 3-.99s2 .32 3 .99c1-.67 2-.99 3-.99"
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
    href: "/ciurma",
    label: "Ciurma",
    icon: (
      <>
        <path
          d="m7.25 18 9.5-9.5m0 9.5-9.5-9.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M12 4.5c2.62 0 4.75 1.96 4.75 4.38 0 1.79-1.16 3.31-2.81 4v1.12c0 .62-.5 1.12-1.12 1.12h-1.64c-.62 0-1.12-.5-1.12-1.12v-1.12c-1.65-.69-2.81-2.21-2.81-4C7.25 6.46 9.38 4.5 12 4.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M10.3 9.4h.02m3.36 0h.02m-2.53 2.44c.32.24.6.35.83.35.23 0 .5-.11.83-.35"
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
          d="M8.25 5.5h7a2.5 2.5 0 0 1 0 5H8.25a2.5 2.5 0 1 1 0-5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M8.25 10.5h7a2.5 2.5 0 1 1 0 5h-7a2.5 2.5 0 1 0 0 5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M9.75 8h4.5m-4.5 5h4.5m-4.5 5h3"
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

export function BottomNav() {
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
