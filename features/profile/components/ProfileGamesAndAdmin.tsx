import * as React from "react";
import Link from "next/link";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { ScratchAndWinCard } from "@/components/scratch-and-win-card";

export interface ProfileGamesAndAdminProps {
  data: ProfileResponse;
  isLoggedAdmin: boolean;
  hasOnPremiseAccess: boolean;
  registerVisit: (customerCode: string) => void;
}

export function ProfileGamesAndAdmin({
  data,
  isLoggedAdmin,
  hasOnPremiseAccess,
  registerVisit,
}: ProfileGamesAndAdminProps) {
  if (isLoggedAdmin) return null;

  return (
    <div id="sfide" className="panel hash-scroll-target rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Sfide e contenuti</p>
        </div>

        <span className="rounded-full border border-[rgba(171,128,63,0.18)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Esclusive
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {/* Client-facing cards (Hidden for Admins) */}
        <>
            {hasOnPremiseAccess && (
              <>
                <ScratchAndWinCard
                  className="mt-4"
                  onClick={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
                />
              </>
            )}

            {/* Receipt Upload Card - Client */}
            <Link
              href="/ciurma/carica-scontrino"
              className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-[var(--accent-strong)] bg-[var(--accent-soft)]/5 mt-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white uppercase italic">💰 Carica Scontrino</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                    Hai cenato al Tortuga? Carica la foto dello scontrino per accumulare punti sulla tua card!
                  </p>
                </div>
                <span className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent-strong)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  CARICA
                </span>
              </div>
            </Link>
        </>

      </div>
    </div>
  );
}
