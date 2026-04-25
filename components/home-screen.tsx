"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ActiveCouponsCard } from "@/components/active-coupons-card";
import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { StatusBlock } from "@/components/status-block";
import { CaptainChallengeTeaser } from "@/features/game/components/CaptainChallengeTeaser";
import { requestJson } from "@/lib/client";
import type { ProfileResponse, UpcomingReservation } from "@/lib/cooperto/types";
import {
  getBirthdayInsight,
  getProfileUpcomingReservations,
  getProfilePoints,
  sortActiveCoupons,
} from "@/lib/customer-profile";
import {
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import { cn } from "@/lib/utils";

type RouteFallback = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const loadProfileData = async (email: string) => {
  const normalizedEmail = normalizeCustomerEmail(email);
  const params = new URLSearchParams({
    mode: "email",
    query: normalizedEmail,
  });

  return requestJson<ProfileResponse>(`/api/profile?${params.toString()}`);
};

const formatRouteDate = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(value));

const formatRouteTime = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const buildRouteFallback = ({
  birthdayLabel,
  birthdayDays,
  birthdayIsToday,
  hasIdentityEmail,
}: {
  birthdayLabel?: string;
  birthdayDays?: number;
  birthdayIsToday?: boolean;
  hasIdentityEmail: boolean;
}): RouteFallback => {
  if (birthdayLabel) {
    return {
      eyebrow: "Rotta speciale",
      title: birthdayIsToday
        ? "Oggi il Tortuga festeggia con te."
        : `Compleanno in vista: ${birthdayLabel}.`,
      description: birthdayIsToday
        ? "Controlla la tua ciurma e preparati a salpare con i dati cliente gia pronti."
        : `Mancano ${birthdayDays} giorni: la tua ciurma e gia pronta per una serata speciale.`,
      primaryHref: "/ciurma",
      primaryLabel: "Apri la tua ciurma",
      secondaryHref: "/prenota",
      secondaryLabel: "Prenota ora",
    };
  }

  if (hasIdentityEmail) {
    return {
      eyebrow: "Prossima rotta",
      title: "Nessuna prenotazione futura, ma la tua rotta e pronta.",
      description:
        "Hai gia la tua area cliente attiva: puoi prenotare di nuovo in pochi tocchi o controllare la ciurma.",
      primaryHref: "/prenota",
      primaryLabel: "Prenota ora",
      secondaryHref: "/ciurma",
      secondaryLabel: "Apri la tua ciurma",
    };
  }

  return {
    eyebrow: "Prima rotta",
    title: "Prenota la tua serata e sali a bordo.",
    description:
      "Scegli data, persone e orario. La tua ciurma si attivera automaticamente con l'email cliente.",
    primaryHref: "/prenota",
    primaryLabel: "Prenota ora",
    secondaryHref: "/ciurma",
    secondaryLabel: "Entra nella ciurma",
  };
};

function RouteStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function RouteCard({
  reservation,
  fallback,
}: {
  reservation: UpcomingReservation | null;
  fallback: RouteFallback;
}) {
  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">La tua prossima rotta</p>
          <h2 className="text-2xl font-semibold leading-tight text-white">
            {reservation ? "La tua serata e gia in rotta verso Tortuga." : fallback.title}
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            {reservation
              ? "Dettagli essenziali della prenotazione, senza passare da schermate tecniche."
              : fallback.description}
          </p>
        </div>

        {reservation ? (
          <span className="rounded-full border border-[rgba(255,216,156,0.12)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {reservation.stateLabel}
          </span>
        ) : (
          <span className="rounded-full border border-[rgba(255,216,156,0.12)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {fallback.eyebrow}
          </span>
        )}
      </div>

      {reservation ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <RouteStat label="Data" value={formatRouteDate(reservation.dateTime)} />
          <RouteStat label="Ora" value={formatRouteTime(reservation.dateTime)} />
          <RouteStat
            label="Persone"
            value={
              reservation.pax ? `${reservation.pax} persone` : "Numero non disponibile"
            }
          />
          {reservation.roomName ? (
            <RouteStat label="Sala" value={reservation.roomName} />
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={reservation ? "/ciurma" : fallback.primaryHref}
          className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
        >
          {reservation ? "Apri la tua ciurma" : fallback.primaryLabel}
        </Link>

        <Link
          href={reservation ? "/prenota" : fallback.secondaryHref ?? fallback.primaryHref}
          className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
        >
          {reservation ? "Prenota di nuovo" : fallback.secondaryLabel ?? fallback.primaryLabel}
        </Link>
      </div>
    </div>
  );
}

function CrewCard({
  points,
  progressPercent,
  tierLabel,
  tierDescription,
  nextRewardLabel,
  isVip,
  activeCardCode,
}: {
  points: number;
  progressPercent: number;
  tierLabel: string;
  tierDescription: string;
  nextRewardLabel?: string;
  isVip: boolean;
  activeCardCode: string;
}) {
  return (
    <div
      className={cn(
        "panel rounded-[2rem] p-5",
        isVip &&
          "border-[rgba(242,215,165,0.38)] bg-[linear-gradient(160deg,rgba(242,215,165,0.18),rgba(13,9,6,0.98)_34%,rgba(58,39,19,0.84)_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.42)]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className={cn("eyebrow", isVip && "text-[#f5deb0]")}>La tua ciurma card</p>
          <h2 className="text-2xl font-semibold text-white">{tierLabel}</h2>
          <p
            className={cn(
              "text-sm leading-6 text-[var(--text-muted)]",
              isVip && "text-[rgba(245,222,176,0.82)]",
            )}
          >
            {tierDescription}
          </p>
        </div>

        {isVip ? (
          <span className="rounded-full border border-[rgba(242,215,165,0.32)] bg-[rgba(242,215,165,0.16)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5deb0]">
            VIP
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px]">
        <div className="space-y-4 rounded-[1.7rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Saldo punti
              </p>
              <p className="mt-2 text-4xl font-semibold text-white">{points}</p>
            </div>
            {nextRewardLabel ? (
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Prossimo premio
                </p>
                <p className="mt-2 text-sm font-medium text-white">{nextRewardLabel}</p>
              </div>
            ) : (
              <p className="max-w-[9rem] text-right text-sm leading-6 text-[var(--text-muted)]">
                Premio finale gia raggiunto.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
              <div
                className={cn(
                  "h-full rounded-full bg-[linear-gradient(90deg,#f7e0b2_0%,#d5a65b_50%,#8d6330_100%)] transition-[width] duration-500",
                  !nextRewardLabel &&
                    "bg-[linear-gradient(90deg,#f9e8c5_0%,#f2c978_42%,#b57b2f_100%)]",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              {nextRewardLabel
                ? "La progress bar mostra quanto manca al prossimo premio."
                : "Hai gia raggiunto il traguardo finale della rotta Tortuga."}
            </p>
          </div>
        </div>

        {activeCardCode ? (
          <div className="rounded-[1.7rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-4">
            <FidelityQrCode
              value={activeCardCode}
              label="QR fidelity Tortuga"
              variant={isVip ? "vip" : "default"}
            />
          </div>
        ) : (
          <div className="flex min-h-[132px] items-center justify-center rounded-[1.7rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-4 text-center text-sm leading-6 text-[var(--text-muted)]">
            QR fidelity disponibile appena la card viene associata.
          </div>
        )}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const { identity } = useCustomerIdentity();
  const identityEmail = normalizeCustomerEmail(identity.email);
  const [profileState, setProfileState] = useState<{
    email: string;
    profile: ProfileResponse | null;
    error: string;
  }>({
    email: "",
    profile: null,
    error: "",
  });

  useEffect(() => {
    if (!identityEmail) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await loadProfileData(identityEmail);

        if (!cancelled) {
          setProfileState({
            email: identityEmail,
            profile: response,
            error: "",
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setProfileState({
            email: identityEmail,
            profile: null,
            error:
              loadError instanceof Error
                ? loadError.message
                : "Non sono riuscito a leggere la tua ciurma.",
          });
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [identityEmail]);

  const hasProfileStateForEmail = profileState.email === identityEmail;
  const profile =
    identityEmail && hasProfileStateForEmail ? profileState.profile : null;
  const loading = Boolean(identityEmail && !hasProfileStateForEmail);
  const error = identityEmail && hasProfileStateForEmail ? profileState.error : "";
  const activeCoupons = useMemo(
    () => sortActiveCoupons(profile?.coupons ?? []),
    [profile?.coupons],
  );
  const upcomingReservations = getProfileUpcomingReservations(profile, identityEmail);
  const primaryReservation = upcomingReservations[0] ?? null;
  const birthdayInsight = getBirthdayInsight(profile?.contact?.DataDiNascita);
  const points = getProfilePoints(profile);
  const rewardProgress = getFidelityRewardProgress(points);
  const activeCardCode = profile?.contact?.CodiceCard?.trim() || "";

  useEffect(() => {
    if (!hasProfileStateForEmail || !profile) {
      return;
    }

    console.info("[Tortuga reservations][HOME] filtro applicato", {
      emailUtente: identityEmail || null,
      prenotazioniRicevute: profile.upcomingReservations.length,
      prenotazioniMostrate: upcomingReservations.length,
      filtro: identityEmail ? "booking.email === currentUser.email" : "no-email-empty",
    });
  }, [
    hasProfileStateForEmail,
    identityEmail,
    profile,
    upcomingReservations.length,
  ]);

  const routeFallback = buildRouteFallback({
    birthdayLabel: birthdayInsight?.label,
    birthdayDays: birthdayInsight?.daysUntil,
    birthdayIsToday: birthdayInsight?.isToday,
    hasIdentityEmail: Boolean(identityEmail),
  });

  return (
    <section className="space-y-5">
      <div className="panel rounded-[2rem] px-5 py-4">
        <p className="eyebrow">Home</p>
        <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.08em] text-white">
          La tua rotta Tortuga
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Prenotazioni, fidelity e contenuti speciali in una Home piu compatta.
        </p>
      </div>

      {loading ? (
        <StatusBlock
          variant="loading"
          title="Sto leggendo la tua rotta"
          description="Recupero prenotazioni, fidelity e coupon collegati alla tua email."
        />
      ) : null}

      {error ? (
        <StatusBlock
          variant="error"
          title="Home parziale"
          description={error}
        />
      ) : null}

      {!loading ? (
        <>
          <RouteCard reservation={primaryReservation} fallback={routeFallback} />

          <CrewCard
            points={rewardProgress.points}
            progressPercent={rewardProgress.progressPercent}
            tierLabel={rewardProgress.loyaltyTier.label}
            tierDescription={rewardProgress.loyaltyTier.description}
            nextRewardLabel={rewardProgress.nextReward?.label}
            isVip={rewardProgress.isVip}
            activeCardCode={activeCardCode}
          />

          <ActiveCouponsCard
            coupons={activeCoupons}
            description="Mostra subito il primo coupon attivo e apri gli altri solo quando ti servono."
            emptyMessage="Al momento non risultano coupon attivi per questa ciurma."
          />

          <CaptainChallengeTeaser compact />

          <div className="panel rounded-[2rem] p-5">
            <div className="space-y-2">
              <p className="eyebrow">Azioni rapide</p>
              <h2 className="text-xl font-semibold text-white">Tre scorciatoie, zero ridondanze.</h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Le azioni essenziali restano sempre a un tap di distanza.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link
                href="/prenota"
                className="button-primary inline-flex min-h-12 items-center justify-center px-4 text-sm"
              >
                Prenota
              </Link>
              <Link
                href="/ciurma"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-4 text-sm"
              >
                Fidelity
              </Link>
              <Link
                href="/info"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-4 text-sm"
              >
                Indicazioni
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
