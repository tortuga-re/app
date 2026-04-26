"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActiveCouponsCard } from "@/components/active-coupons-card";
import { FidelityStatusCard } from "@/components/fidelity-status-card";
import { StatusBlock } from "@/components/status-block";
import { CaptainChallengeTeaser } from "@/features/game/components/CaptainChallengeTeaser";
import { trackAppEvent } from "@/lib/analytics";
import { requestJson } from "@/lib/client";
import { tortugaInfoConfig } from "@/lib/config";
import type { ProfileResponse, UpcomingReservation } from "@/lib/cooperto/types";
import {
  getBirthdayInsight,
  getProfilePoints,
  getProfileUpcomingReservations,
  sortActiveCoupons,
} from "@/lib/customer-profile";
import {
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import { useHashScroll } from "@/lib/hash-scroll";
import { triggerHaptic } from "@/lib/haptics";
import { useOnPremiseAccess } from "@/lib/on-premise-access";

type RouteFallback = {
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
      title: birthdayIsToday
        ? "Stasera hai un buon motivo per tornare a bordo."
        : `Occhio: il ${birthdayLabel} si avvicina.`,
      description: birthdayIsToday
        ? "Se vuoi far saltare il banco, la prenotazione e a un tap."
        : `Mancano ${birthdayDays} giorni. Se vuoi festeggiare bene, muoviti ora.`,
      primaryHref: "/prenota#booking-form",
      primaryLabel: "Prenota adesso",
    };
  }

  if (hasIdentityEmail) {
    return {
      title: "Nessuna rotta fissata. Per ora.",
      description:
        "La tua ciurma e gia agganciata all'email: puoi tornare a prenotare in pochi secondi.",
      primaryHref: "/prenota#booking-form",
      primaryLabel: "Prenota adesso",
    };
  }

  return {
    title: "Prima volta a bordo?",
    description:
      "Scegli data, orario e persone. Il resto lo agganciamo alla tua email.",
    primaryHref: "/prenota#booking-form",
    primaryLabel: "Prenota adesso",
    secondaryHref: "/ciurma#riconoscimento",
    secondaryLabel: "Entra nella ciurma",
  };
};

const getReservationManageHref = () => null;

function ReservationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-muted rounded-[1.45rem] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ReservationCard({
  reservation,
  fallback,
}: {
  reservation: UpcomingReservation | null;
  fallback: RouteFallback;
}) {
  const manageHref = getReservationManageHref();

  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Prossima prenotazione</p>
          {!reservation ? (
            <>
              <h2 className="text-2xl font-semibold leading-tight text-white">
                {fallback.title}
              </h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                {fallback.description}
              </p>
            </>
          ) : null}
        </div>

        {reservation?.stateLabel ? (
          <span className="rounded-full border border-[rgba(171,128,63,0.22)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {reservation.stateLabel}
          </span>
        ) : null}
      </div>

      {reservation ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ReservationStat label="Stato" value={reservation.stateLabel} />
            <ReservationStat label="Data" value={formatRouteDate(reservation.dateTime)} />
            <ReservationStat label="Ora" value={formatRouteTime(reservation.dateTime)} />
            <ReservationStat
              label="Persone"
              value={
                reservation.pax ? `${reservation.pax} persone` : "Dato non disponibile"
              }
            />
            {reservation.roomName ? (
              <div className="col-span-2">
                <ReservationStat label="Sala" value={reservation.roomName} />
              </div>
            ) : null}
          </div>

          {manageHref ? (
            <a
              href={manageHref}
              target="_blank"
              rel="noreferrer"
              className="button-primary mt-5 inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Modifica/Annulla prenotazione
            </a>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Modifica e annullo compariranno qui appena Cooperto espone un link diretto.
            </p>
          )}
        </>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={fallback.primaryHref}
            className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
            onClick={() => triggerHaptic()}
          >
            {fallback.primaryLabel}
          </Link>
          {fallback.secondaryHref ? (
            <Link
              href={fallback.secondaryHref}
              className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              {fallback.secondaryLabel}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CoopertoMenuCard() {
  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="space-y-2">
        <p className="eyebrow">Menu</p>
        <h2 className="text-2xl font-semibold leading-tight text-white">
          Menu e mondo Tortuga
        </h2>
      </div>

      <a
        href={tortugaInfoConfig.menuUrl}
        target="_blank"
        rel="noreferrer"
        className="button-primary mt-5 flex min-h-14 w-full items-center justify-center px-5 text-sm"
        onClick={() => triggerHaptic()}
      >
        MENU
      </a>
    </div>
  );
}

export function HomeScreen() {
  const { identity } = useCustomerIdentity();
  const identityEmail = normalizeCustomerEmail(identity.email);
  const viewedReservationsKeyRef = useRef("");
  const { hasAccess: hasMenuAccess } = useOnPremiseAccess();
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
  useHashScroll(
    `${loading}:${hasMenuAccess}:${primaryReservation?.reservationCode ?? "none"}:${activeCoupons.length}`,
  );
  const routeFallback = buildRouteFallback({
    birthdayLabel: birthdayInsight?.label,
    birthdayDays: birthdayInsight?.daysUntil,
    birthdayIsToday: birthdayInsight?.isToday,
    hasIdentityEmail: Boolean(identityEmail),
  });

  useEffect(() => {
    if (!identityEmail || loading || !hasProfileStateForEmail) {
      return;
    }

    const reservationKey = `${identityEmail}|${upcomingReservations.length}|${
      primaryReservation?.reservationCode ?? "none"
    }`;

    if (viewedReservationsKeyRef.current === reservationKey) {
      return;
    }

    viewedReservationsKeyRef.current = reservationKey;
    trackAppEvent("view_prenotazioni", {
      app_section: "home",
      reservation_count: upcomingReservations.length,
      has_future_reservation: Boolean(primaryReservation),
      reservation_status: primaryReservation?.stateLabel,
    });
  }, [
    hasProfileStateForEmail,
    identityEmail,
    loading,
    primaryReservation,
    upcomingReservations.length,
  ]);

  return (
    <section className="space-y-5">
      {loading ? (
        <StatusBlock
          variant="loading"
          title="Sto leggendo la tua rotta"
          description="Recupero prenotazioni, bottino e coupon legati alla tua email."
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
          <div id="prossima-prenotazione" className="hash-scroll-target rounded-[2rem]">
            {hasMenuAccess ? (
              <CoopertoMenuCard />
            ) : (
              <ReservationCard reservation={primaryReservation} fallback={routeFallback} />
            )}
          </div>

          {hasMenuAccess ? (
            <div id="sfida-capitano" className="hash-scroll-target rounded-[2rem]">
              <CaptainChallengeTeaser compact />
            </div>
          ) : null}

          <div id="ciurma-card" className="hash-scroll-target rounded-[2rem]">
            <div id="fidelity" className="hash-scroll-target rounded-[2rem]">
              <FidelityStatusCard
                title="FIDELITY TORTUGA"
                points={rewardProgress.points}
                progressPercent={rewardProgress.progressPercent}
                tierLabel={rewardProgress.loyaltyTier.label}
                tierDescription={rewardProgress.loyaltyTier.description}
                nextRewardLabel={rewardProgress.nextReward?.label}
                isVip={rewardProgress.isVip}
                activeCardCode={activeCardCode}
                qrLabel="QR ciurma Tortuga"
              />
            </div>
          </div>

          <div id="coupon" className="hash-scroll-target rounded-[2rem]">
            <ActiveCouponsCard
              coupons={activeCoupons}
              description=""
              emptyMessage="Nessun coupon attivo da spendere per ora."
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
