import Link from "next/link";

import { AppGreeting } from "@/components/app-greeting";
import { BottomNav } from "@/components/bottom-nav";
import { PwaController } from "@/components/pwa-controller";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-6%] h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(194,139,70,0.3),_transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[8%] right-[-12%] h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(242,215,165,0.16),_transparent_70%)] blur-3xl" />
        <div className="absolute inset-x-0 top-24 h-28 bg-[linear-gradient(180deg,rgba(255,226,179,0.06),transparent)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-32 pt-5">
        <header className="mb-6">
          <div className="panel rounded-[2.15rem] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <Link href="/prenota" className="min-w-0 flex-1">
                <AppGreeting />
              </Link>

              <Link
                href="/profilo"
                className="rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)] transition hover:bg-[rgba(242,215,165,0.18)]"
              >
                Profilo
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-5">
          <PwaController />

          <main className="flex-1">
            <div className="space-y-5">{children}</div>
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
