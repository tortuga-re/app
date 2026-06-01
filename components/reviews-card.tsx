"use client";

import { tortugaInfoConfig } from "@/lib/config";

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ReviewsCard() {
  return (
    <div id="recensioni" className="panel parchment-texture hash-scroll-target rounded-[2rem] p-5">
      <div className="space-y-2">
        <p className="eyebrow">Cosa dicono di noi</p>
        <h2 className="text-2xl font-semibold leading-tight text-white">
          La parola alla ciurma
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {tortugaInfoConfig.reviews.map((review, index) => (
          <div key={index} className="panel-muted rounded-[1.5rem] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-0.5 text-[var(--accent-strong)]">
                {[...Array(review.rating)].map((_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-80">
                {review.source}
              </span>
            </div>
            <p className="mt-3 text-[13px] italic leading-6 text-white/90">
              &quot;{review.text}&quot;
            </p>
            <p className="mt-3 text-xs font-semibold text-[var(--accent-strong)]">
              — {review.author}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
