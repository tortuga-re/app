"use client";

import Link from "next/link";
import { triggerHaptic } from "@/lib/haptics";
import { tortugaInfoConfig } from "@/lib/config";

const getTodayPromo = () => {
  const day = new Date().getDay();
  const promoByDay: Record<number, (typeof tortugaInfoConfig.eveningProgram)[number] | null> = {
    0: tortugaInfoConfig.eveningProgram[4],
    1: null,
    2: null,
    3: tortugaInfoConfig.eveningProgram[0],
    4: tortugaInfoConfig.eveningProgram[1],
    5: tortugaInfoConfig.eveningProgram[2],
    6: tortugaInfoConfig.eveningProgram[3],
  };

  return promoByDay[day] ?? null;
};

export function VenueModeCard({
  activeGames,
  onOpenMenu,
}: {
  activeGames: { buzzer: boolean; matchDrink: boolean };
  onOpenMenu?: () => void;
}) {
  const todayPromo = getTodayPromo();

  return (
    <div className="panel rounded-[2rem] border-[var(--accent-strong)]/30 bg-[var(--accent-soft)]/8 p-5">
      <div className="space-y-3">
        <p className="eyebrow">Modalita nel locale</p>
        <h2 className="text-3xl font-black uppercase tracking-tight text-white">
          Sei al Tortuga adesso.
        </h2>
      </div>

      <div className="mt-4 panel-muted rounded-[1.35rem] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Promo attive
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white">
          {todayPromo
            ? `${todayPromo.title.toUpperCase()} - ${todayPromo.description}`
            : "Nessuna promo attiva oggi"}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={tortugaInfoConfig.menuUrl}
          target="_blank"
          rel="noreferrer"
          className="button-primary flex min-h-16 items-center justify-center px-5 text-sm sm:col-span-2"
          onClick={() => {
            triggerHaptic();
            onOpenMenu?.();
          }}
        >
          Apri menu del locale
        </a>
        {activeGames.buzzer ? (
          <Link
            href="/game/buzzer"
            className="group relative flex min-h-16 items-center justify-center overflow-hidden rounded-full border border-[rgba(216,176,106,0.48)] bg-[linear-gradient(180deg,rgba(216,176,106,0.14),rgba(8,6,4,0.96))] px-5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(216,176,106,0.08),0_16px_40px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,240,205,0.12)] transition hover:border-[rgba(242,215,165,0.72)] hover:bg-[linear-gradient(180deg,rgba(216,176,106,0.2),rgba(10,8,6,0.96))]"
            onClick={() => triggerHaptic()}
          >
            <span className="absolute right-4 top-3 rounded-full border border-[rgba(255,222,157,0.42)] bg-[rgba(216,176,106,0.14)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Live
            </span>
            <span className="text-center">Tortuga Music Quiz</span>
          </Link>
        ) : null}
        {activeGames.matchDrink ? (
          <Link
            href="/ciurma#match-drink"
            className="group relative flex min-h-16 items-center justify-center overflow-hidden rounded-full border border-[rgba(216,176,106,0.48)] bg-[linear-gradient(180deg,rgba(216,176,106,0.14),rgba(8,6,4,0.96))] px-5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(216,176,106,0.08),0_16px_40px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,240,205,0.12)] transition hover:border-[rgba(242,215,165,0.72)] hover:bg-[linear-gradient(180deg,rgba(216,176,106,0.2),rgba(10,8,6,0.96))]"
            onClick={() => triggerHaptic()}
          >
            <span className="absolute right-4 top-3 rounded-full border border-[rgba(255,222,157,0.42)] bg-[rgba(216,176,106,0.14)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Live
            </span>
            <span className="text-center">Apri Match &amp; Drink</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
