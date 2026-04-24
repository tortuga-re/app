"use client";

import { GameResultCard } from "@/features/game/components/GameResultCard";
import { ReferralLifeCard } from "@/features/game/components/ReferralLifeCard";
import { useCaptainChallenge } from "@/features/game/hooks/useCaptainChallenge";
import { cn } from "@/lib/utils";

function FuseVisual({ phase }: { phase: string }) {
  const isWaiting = phase === "waiting";
  const isGo = phase === "go" || phase === "submitting";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.8rem] border border-[rgba(255,216,156,0.13)] bg-[linear-gradient(180deg,rgba(38,25,16,0.95),rgba(9,7,6,0.98))] px-5 py-8",
        isGo && "captain-explosion border-[rgba(240,139,117,0.44)]",
      )}
    >
      <span className="captain-spark captain-spark-one" />
      <span className="captain-spark captain-spark-two" />
      <span className="captain-spark captain-spark-three" />

      <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-[rgba(255,216,156,0.16)] bg-[rgba(255,255,255,0.04)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div
          className={cn(
            "h-20 w-20 rounded-full border border-[rgba(255,216,156,0.18)] bg-[radial-gradient(circle,#f4d49b_0%,#c28b46_34%,#4d2418_68%,#130b08_100%)] shadow-[0_0_34px_rgba(194,139,70,0.25)]",
            isWaiting && "captain-fuse-core",
            isGo && "captain-go-core",
          )}
        />
      </div>

      <p
        className={cn(
          "mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.26em]",
          isGo ? "text-[var(--danger)]" : "text-[var(--accent-strong)]",
        )}
      >
        {isGo ? "Tappa ora" : isWaiting ? "Miccia accesa" : "Pronto"}
      </p>
    </div>
  );
}

export function CaptainChallenge({
  incomingReferralCode = "",
}: {
  incomingReferralCode?: string;
}) {
  const {
    phase,
    result,
    error,
    lives,
    livesLoading,
    referralUrl,
    referralLoading,
    referralClaimMessage,
    start,
    tap,
    reset,
    createReferral,
    canTap,
  } = useCaptainChallenge(incomingReferralCode);

  const isIdle = phase === "idle";
  const isStarting = phase === "starting";
  const isWaiting = phase === "waiting";
  const isGo = phase === "go";
  const isSubmitting = phase === "submitting";
  const hasLives = (lives ?? 0) > 0;
  const showStartPanel =
    (isIdle || isStarting) && (livesLoading || hasLives);
  const showNoLivesPanel =
    !livesLoading && !hasLives && (phase === "idle" || phase === "no_lives");

  return (
    <section className="space-y-5">
      <div className="panel rounded-[2rem] px-5 py-5">
        <p className="eyebrow">Gioco Tortuga</p>
        <h1 className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-[0.08em] text-white">
          Sfida il Capitano
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Una miccia, un segnale, un solo tap. Il Capitano misura tutto dal
          server: il telefono non decide il risultato.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-[rgba(255,216,156,0.12)] bg-white/4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Vite disponibili: {livesLoading ? "..." : lives ?? 0}
        </div>
      </div>

      {referralClaimMessage ? (
        <div className="panel rounded-[2rem] px-5 py-4">
          <p className="eyebrow">Arruolamento</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {referralClaimMessage}
          </p>
        </div>
      ) : null}

      {showStartPanel ? (
        <div className="panel rounded-[2rem] p-5">
          <FuseVisual phase={phase} />
          <button
            type="button"
            className="button-primary mt-5 flex min-h-14 w-full items-center justify-center px-5 text-sm"
            onClick={() => void start()}
            disabled={isStarting || livesLoading}
          >
            {isStarting ? "Accendo la miccia..." : "Inizia"}
          </button>
        </div>
      ) : null}

      {showNoLivesPanel ? (
        <div className="panel rounded-[2rem] p-5">
          <p className="eyebrow text-[var(--danger)]">Vite esaurite</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Il Capitano non regala seconde possibilita.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Vuoi un&apos;altra vita? Arruola un pirata.
          </p>
          <div className="mt-5">
            <ReferralLifeCard
              referralUrl={referralUrl}
              referralLoading={referralLoading}
              onCreateReferral={createReferral}
            />
          </div>
        </div>
      ) : null}

      {isWaiting || isGo || isSubmitting ? (
        <button
          type="button"
          className={cn(
            "block w-full text-left",
            canTap ? "cursor-pointer" : "cursor-wait",
          )}
          onClick={() => {
            if (canTap) {
              void tap();
            }
          }}
          disabled={isSubmitting}
        >
          <div className="panel rounded-[2rem] p-5">
            <FuseVisual phase={phase} />
            <div className="mt-5 rounded-[1.5rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-4 text-center">
              <p
                className={cn(
                  "text-xl font-semibold text-white",
                  isGo && "text-[var(--danger)]",
                )}
              >
                {isWaiting
                  ? "Tieni fermo il dito."
                  : isSubmitting
                    ? "Il Capitano controlla il tap..."
                    : "Ora."}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {isWaiting
                  ? "Se tocchi prima del segnale, perdi."
                  : "Il server sta misurando il tuo riflesso reale."}
              </p>
            </div>
          </div>
        </button>
      ) : null}

      {phase === "result" && result ? (
        <GameResultCard
          result={result}
          referralUrl={referralUrl}
          referralLoading={referralLoading}
          onCreateReferral={createReferral}
        />
      ) : null}

      {phase === "error" ? (
        <div className="panel rounded-[2rem] p-5">
          <p className="eyebrow text-[var(--danger)]">Sfida interrotta</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Qualcosa non torna.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {error || "Round non validabile."}
          </p>
          <button
            type="button"
            className="button-secondary mt-5 inline-flex min-h-11 items-center justify-center px-5 text-sm"
            onClick={reset}
          >
            Torna al quadro sfida
          </button>
        </div>
      ) : null}
    </section>
  );
}
