"use client";

import { tortugaInfoConfig } from "@/lib/config";
import { CollapsibleWrapper } from "@/components/collapsible-wrapper";

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ReviewsCard() {
  return (
    <div id="recensioni" className="hash-scroll-target rounded-[2rem]">
      <CollapsibleWrapper
        title="Cosa dicono di noi"
        subtitle="La parola alla ciurma"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.2rem] border border-[rgba(255,216,156,0.2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/TOP-3-TRIPADVISOR.png"
              alt="Top 3 TripAdvisor"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
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
      </CollapsibleWrapper>
    </div>
  );
}
