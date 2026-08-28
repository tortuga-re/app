import type { TortugaRankId } from "@/lib/loyalty-ranks";

const symbols: Record<TortugaRankId, React.ReactNode> = {
  mozzo: <><path d="M31 18v27M22 28h18M20 45h22" /><path d="M24 45c1 8 13 8 15 0" /></>,
  corsaro: <><path d="M31 16v31M22 27h18" /><path d="M18 39c4 2 7 1 9-2 0 10-2 14-9 12M44 39c-4 2-7 1-9-2 0 10 2 14 9 12" /><circle cx="31" cy="13" r="2.5" /></>,
  capitano: <><path d="M31 17v30M21 27h20" /><path d="M18 40c5 2 8 0 10-4 0 11-3 15-10 13M44 40c-5 2-8 0-10-4 0 11 3 15 10 13" /><path d="m31 9 2 4 5 .6-3.5 3.3.9 4.8-4.4-2.3-4.4 2.3.9-4.8-3.5-3.3 5-.6z" /></>,
  leggenda: <><path d="M31 17v30M21 27h20" /><path d="M17 39c6 3 9 0 11-4 0 11-3 16-11 14M45 39c-6 3-9 0-11-4 0 11 3 16 11 14" /><path d="m31 7 2.3 4.6 5.1.8-3.7 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.7-3.6 5.1-.8z" /><path d="M19 23h-5M48 23h-5" /></>,
};

export function RankBadge({ rank, label, size = 76 }: { rank: TortugaRankId; label: string; size?: number }) {
  return <div className={`rank-badge rank-badge-${rank}`} style={{ width: size, height: size * 1.16 }} aria-label={`Rango ${label}`}>
    <svg viewBox="0 0 62 72" role="img">
      <path className="badge-shell" d="M31 2 56 10v27c0 16-10 26-25 33C16 63 6 53 6 37V10L31 2Z" />
      <path className="badge-inset" d="M31 7 51 13v23c0 13-8 22-20 28-12-6-20-15-20-28V13L31 7Z" />
      <g className="badge-symbol" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{symbols[rank]}</g>
    </svg>
    <span>{label.replace(" del Tortuga", "")}</span>
  </div>;
}
