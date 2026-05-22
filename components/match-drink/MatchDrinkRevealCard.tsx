"use client";

import { useId } from "react";
import { MatchDrinkCard } from "./MatchDrinkCard";
import { cn } from "@/lib/utils";
import { MatchDrinkMainCategory } from "@/lib/match-drink/types";

function CategoryIllustration({ categoryKey, className }: { categoryKey: MatchDrinkMainCategory; className?: string }) {
  const uid = useId().replace(/:/g, "");

  if (categoryKey === "romantico") {
    return (
      <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`romantic-heart-grad-${uid}`} x1="60" y1="20" x2="260" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE8D6" />
            <stop offset="0.35" stopColor="#D8B06A" />
            <stop offset="0.7" stopColor="#B57A35" />
            <stop offset="1" stopColor="#6B381A" />
          </linearGradient>
          <filter id={`romantic-heart-shadow-${uid}`} x="0" y="0" width="320" height="180" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>
        <g filter={`url(#romantic-heart-shadow-${uid})`}>
          <path d="M90 42C72 42 58 56 58 74C58 108 106 136 160 160C214 136 262 108 262 74C262 56 248 42 230 42C212 42 196 53 188 69C180 53 174 42 160 42C146 42 140 53 132 69C124 53 108 42 90 42Z" fill={`url(#romantic-heart-grad-${uid})`} />
          <path d="M90 49C76 49 65 60 65 74C65 99 101 121 160 147C219 121 255 99 255 74C255 60 244 49 230 49C214 49 201 60 196 74C190 60 178 49 160 49C142 49 130 60 124 74C119 60 106 49 90 49Z" fill="#fff" fillOpacity="0.14" />
        </g>
      </svg>
    );
  }

  if (categoryKey === "passionale") {
    return (
      <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`passionate-flame-grad-${uid}`} x1="90" y1="30" x2="230" y2="150" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF1A8" />
            <stop offset="0.35" stopColor="#FFBA4C" />
            <stop offset="0.7" stopColor="#FF6E32" />
            <stop offset="1" stopColor="#7A1B18" />
          </linearGradient>
          <filter id={`passionate-flame-shadow-${uid}`} x="0" y="0" width="320" height="180" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>
        <g filter={`url(#passionate-flame-shadow-${uid})`}>
          <path d="M160 20C176 42 178 58 170 74C164 86 168 97 180 108C198 124 204 146 190 160C174 176 146 176 130 160C116 146 122 124 140 108C152 97 156 86 150 74C142 58 144 42 160 20Z" fill={`url(#passionate-flame-grad-${uid})`} />
          <path d="M160 54C168 64 168 72 164 80C160 87 160 93 166 98C174 105 176 117 168 124C160 132 150 132 142 124C134 117 136 105 144 98C150 93 150 87 146 80C142 72 142 64 160 54Z" fill="#fff" fillOpacity="0.28" />
        </g>
      </svg>
    );
  }

  if (categoryKey === "piccante") {
    return (
      <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`spicy-chili-grad-${uid}`} x1="60" y1="20" x2="260" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE08A" />
            <stop offset="0.3" stopColor="#F55B31" />
            <stop offset="0.75" stopColor="#B61D18" />
            <stop offset="1" stopColor="#5A0B11" />
          </linearGradient>
          <filter id={`spicy-chili-shadow-${uid}`} x="0" y="0" width="320" height="180" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>
        <g filter={`url(#spicy-chili-shadow-${uid})`}>
          <path d="M240 50C220 44 202 58 190 76C176 97 154 118 126 132C106 142 90 144 72 142C60 141 50 150 50 162C50 170 56 176 64 176C98 176 132 164 162 146C196 125 220 100 234 78C244 63 252 53 240 50Z" fill={`url(#spicy-chili-grad-${uid})`} />
          <path d="M118 129C128 119 137 109 144 98C150 88 164 72 184 61" stroke="#fff" strokeOpacity="0.35" strokeWidth="8" strokeLinecap="round" />
          <circle cx="238" cy="52" r="7" fill="#FFD36A" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`energetic-bolt-grad-${uid}`} x1="60" y1="20" x2="260" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1B3" />
          <stop offset="0.28" stopColor="#D7F0FF" />
          <stop offset="0.62" stopColor="#7DD1FF" />
          <stop offset="1" stopColor="#2159C5" />
        </linearGradient>
        <filter id={`energetic-bolt-shadow-${uid}`} x="0" y="0" width="320" height="180" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#energetic-bolt-shadow-${uid})`}>
        <path d="M182 14L92 104H144L126 166L226 70H170L182 14Z" fill={`url(#energetic-bolt-grad-${uid})`} />
        <path d="M176 34L118 94H156L144 138L202 82H166L176 34Z" fill="#fff" fillOpacity="0.2" />
      </g>
    </svg>
  );
}

interface MatchDrinkRevealCardProps {
  nickname: string;
  avatarUrl?: string | null;
  avatarInitial?: string | null;
  tableNumber: string;
  tableArea: string;
  categoryKey: MatchDrinkMainCategory;
  categorySummary: string | null;
  secondaryTraitLabel: string;
  approachAdvice: string;
  rewardText: string;
  onAvatarClick?: () => void;
  className?: string;
}

export function MatchDrinkRevealCard({
  nickname,
  avatarUrl,
  avatarInitial,
  tableNumber,
  tableArea,
  categoryKey,
  categorySummary,
  secondaryTraitLabel,
  approachAdvice,
  rewardText,
  onAvatarClick,
  className,
}: MatchDrinkRevealCardProps) {
  const AvatarContent = avatarUrl ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={avatarUrl} alt={`${nickname} avatar`} className="h-full w-full object-cover" />
  ) : (
    <span className="text-6xl font-black uppercase italic gold-gradient">{avatarInitial || nickname[0] || "?"}</span>
  );

  const avatarNode = onAvatarClick ? (
    <button
      type="button"
      onClick={onAvatarClick}
      className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent-strong)] bg-black/40 shadow-[0_0_30px_rgba(216,176,106,0.25)] transition-transform hover:scale-105"
      aria-label={`Ingrandisci avatar di ${nickname}`}
    >
      {AvatarContent}
    </button>
  ) : (
    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent-strong)] bg-black/40 shadow-[0_0_30px_rgba(216,176,106,0.25)]">
      {AvatarContent}
    </div>
  );

  return (
    <MatchDrinkCard variant="accent" className={cn("overflow-hidden", className)}>
      <div className="space-y-5">
        <div className="space-y-2 text-center">
          <p className="eyebrow">Match confermato.</p>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            Il Capitano ha aperto la rotta
          </h2>
        </div>

        <div className="panel-muted rounded-[1.75rem] border border-[var(--accent-strong)]/25 bg-black/50 px-5 py-6 shadow-[0_0_40px_rgba(216,176,106,0.16)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xl font-black uppercase italic tracking-tighter text-white">{nickname}</p>
            <div className="relative">
              {avatarNode}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-strong)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-black">
                Tavolo {tableNumber}
              </div>
            </div>
          <div className="space-y-3 pt-4">
            <div className="flex justify-center">
              <CategoryIllustration
                categoryKey={categoryKey}
                className="h-16 w-auto max-w-[11rem] drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
              />
            </div>
              <p className="text-sm font-bold uppercase tracking-wide text-white/85">
                INCONTRATEVI AL TAVOLO {tableNumber} IN {tableArea}.
              </p>
              <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-strong)]">
                {categorySummary}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
            <p className="eyebrow mb-2">Da sapere</p>
            <p className="text-sm leading-relaxed text-white">
              {nickname} è anche <span className="font-bold uppercase">{secondaryTraitLabel || "misterioso"}</span>.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
            <p className="eyebrow mb-2">Consiglio del Capitano</p>
            <p className="text-sm leading-relaxed text-white/90">{approachAdvice}</p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--accent-strong)]/30 bg-[var(--accent-strong)]/10 px-5 py-4">
            <p className="text-sm font-bold leading-relaxed text-[var(--accent-strong)]">{rewardText}</p>
          </div>
        </div>
      </div>
    </MatchDrinkCard>
  );
}

