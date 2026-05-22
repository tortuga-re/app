"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";
import { StatusBlock } from "@/components/status-block";

const ActiveCouponsCard = dynamic(() => import("@/components/active-coupons-card").then(mod => mod.ActiveCouponsCard), { ssr: false });
const FidelityStatusCard = dynamic(() => import("@/components/fidelity-status-card").then(mod => mod.FidelityStatusCard), { ssr: false });
const SurveyTeaserCard = dynamic(() => import("@/components/survey-teaser-card").then(mod => mod.SurveyTeaserCard), { ssr: false });
const KantaquizTeaser = dynamic(() => import("@/components/kantaquiz-teaser").then(mod => mod.KantaquizTeaser), { ssr: false });
const BuzzerTeaser = dynamic(() => import("@/components/buzzer-teaser").then(mod => mod.BuzzerTeaser), { ssr: false });
const MatchDrinkTeaser = dynamic(() => import("@/components/match-drink-teaser").then(mod => mod.MatchDrinkTeaser), { ssr: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LiveTvContributionCard = dynamic<any>(() => import("@/features/live-tv/components/LiveTvContributionCard").then(mod => mod.LiveTvContributionCard).catch(() => ({ default: () => null } as any)), { ssr: false });
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
import { useActiveGamesStatus } from "@/lib/game/use-active-games";
import { useHashScroll } from "@/lib/hash-scroll";
import { triggerHaptic } from "@/lib/haptics";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { PwaInstallCard } from "@/components/pwa-install-card";
import { useVisitRegistration } from "@/lib/hooks/use-visit-registration";
import { QRScanner } from "@/components/QRScanner";

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
    <div className="panel parchment-texture rounded-[2rem] p-5">
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

function SmartHeroCard({
  hasMenuAccess,
  reservation,
  activeCouponsCount,
  activeGames,
}: {
  hasMenuAccess: boolean;
  reservation: UpcomingReservation | null;
  activeCouponsCount: number;
  activeGames: { buzzer: boolean; matchDrink: boolean };
}) {
  const hasFutureReservation = Boolean(reservation);
  const isTonight = reservation
    ? new Date(reservation.dateTime).toDateString() === new Date().toDateString()
    : false;

  const title = hasMenuAccess
    ? "Sei a bordo."
    : hasFutureReservation
      ? isTonight
        ? "Hai una prenotazione stasera."
        : "Hai una rotta gia fissata."
      : activeCouponsCount > 0
        ? `Hai ${activeCouponsCount} coupon pronti.`
        : activeGames.buzzer || activeGames.matchDrink
          ? "La serata è in movimento."
          : "Pronti a salpare di nuovo?";

  const description = hasMenuAccess
    ? "Modalita locale attiva: menu, giochi e promo sono a un tap dalla tua mano."
    : hasFutureReservation
      ? isTonight
        ? "Controlla la tua rotta, arriva al tavolo giusto e tieniti pronto per i giochi live."
        : "Hai gia una prenotazione futura: qui sotto trovi tutti i dettagli della tua prossima rotta."
      : activeCouponsCount > 0
        ? "Hai già bottino da spendere: tieni d'occhio la prossima serata utile."
        : activeGames.buzzer || activeGames.matchDrink
          ? "Tra quiz e matchmaking, questa è una di quelle sere in cui conviene esserci."
          : "Prenotazioni, coupon e giochi live compariranno qui nel momento giusto.";

  return (
    <div className="panel rounded-[2rem] border-[var(--accent-strong)]/25 bg-[var(--accent-soft)]/6 p-5">
      <div className="space-y-2">
        <p className="eyebrow">Rotta del momento</p>
        <h2 className="text-2xl font-semibold leading-tight text-white">{title}</h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {hasMenuAccess ? (
          <>
            <Link
              href="/ciurma#sfide"
              className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Apri modalita locale
            </Link>
            <Link
              href="/sedi"
              className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Info tavoli e spazi
            </Link>
          </>
        ) : hasFutureReservation ? (
          <>
            <Link
              href="#prossima-prenotazione"
              className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Vedi prenotazione
            </Link>
            {isTonight ? (
              <Link
                href="/sedi"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
                onClick={() => triggerHaptic()}
              >
                Come arrivare
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <Link
              href="/prenota#booking-form"
              className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Prenota adesso
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function VenueModeCard({
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
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ReviewsCard() {
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

function VenueScannerCard({
  onScanSuccess,
}: {
  onScanSuccess?: () => void;
}) {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="panel parchment-texture rounded-[2.15rem] border border-[rgba(216,176,106,0.28)] bg-[radial-gradient(circle_at_top,rgba(255,216,156,0.16),rgba(19,14,10,0.98)_42%,rgba(10,8,7,1)_100%)] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow text-[var(--accent-strong)]">Sei al Tortuga?</p>
          <h2 className="text-2xl font-semibold leading-tight text-white">
            Scannerizza il QR del tavolo per sbloccare il menu ed i giochi live!
          </h2>
        </div>

        <span className="rounded-full border border-[rgba(255,216,156,0.24)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Live access
        </span>
      </div>

      <div className="mt-5 rounded-[1.6rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
        {showScanner ? (
          <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <QRScanner
              onSuccess={() => {
                setShowScanner(false);
                onScanSuccess?.();
              }}
              onCancel={() => setShowScanner(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="button-primary cta-glow inline-flex min-h-12 w-full items-center justify-center px-5 text-sm"
            onClick={() => {
              triggerHaptic();
              setShowScanner(true);
            }}
          >
            Scannerizza QR
          </button>
        )}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const { identity } = useCustomerIdentity();
  const { registerVisit } = useVisitRegistration();
  const identityEmail = normalizeCustomerEmail(identity.email);
  const viewedReservationsKeyRef = useRef("");
  const { hasAccess: hasMenuAccess } = useOnPremiseAccess();
  const activeGames = useActiveGamesStatus();
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
    `${loading}:${hasMenuAccess}:${primaryReservation?.reservationCode ?? "none"}:${activeCoupons.length}:${Boolean(error)}`,
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

  useEffect(() => {
    if (loading) {
      return;
    }

    const context =
      hasMenuAccess
        ? "on_premise"
        : primaryReservation
          ? "reservation"
          : activeCoupons.length > 0
            ? "coupon"
            : activeGames.buzzer || activeGames.matchDrink
              ? "live_games"
              : "default";

    trackAppEvent("home_context_view", {
      app_section: "home",
      home_context: context,
      has_menu_access: hasMenuAccess,
      has_live_buzzer: activeGames.buzzer,
      has_live_match_drink: activeGames.matchDrink,
    });
  }, [
    activeCoupons.length,
    activeGames.buzzer,
    activeGames.matchDrink,
    hasMenuAccess,
    loading,
    primaryReservation,
  ]);

  useEffect(() => {
    if (!hasMenuAccess || loading) {
      return;
    }

    trackAppEvent("live_mode_view", {
      app_section: "home",
      has_live_buzzer: activeGames.buzzer,
      has_live_match_drink: activeGames.matchDrink,
      active_coupon_count: activeCoupons.length,
      has_reservation: Boolean(primaryReservation),
    });
  }, [
    activeCoupons.length,
    activeGames.buzzer,
    activeGames.matchDrink,
    hasMenuAccess,
    loading,
    primaryReservation,
  ]);

  const showHeroCard = !hasMenuAccess && !primaryReservation;
  const showReservationCard = !hasMenuAccess && Boolean(primaryReservation);
  const showCouponCard = hasMenuAccess || !primaryReservation;

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
          {hasMenuAccess ? (
            <>
              <VenueModeCard
                activeGames={activeGames}
                onOpenMenu={() => void registerVisit(profile?.contact?.CodiceContatto)}
              />
              <div id="contributi-live" className="hash-scroll-target rounded-[2rem]">
                <LiveTvContributionCard
                  contact={profile?.contact ?? null}
                  onVisitTrigger={() => void registerVisit(profile?.contact?.CodiceContatto)}
                />
              </div>
            </>
          ) : showHeroCard ? (
            <SmartHeroCard
              hasMenuAccess={false}
              reservation={primaryReservation}
              activeCouponsCount={activeCoupons.length}
              activeGames={activeGames}
            />
          ) : null}
          {!hasMenuAccess ? (
            <VenueScannerCard
              onScanSuccess={() => void registerVisit(profile?.contact?.CodiceContatto)}
            />
          ) : null}
          <SurveyTeaserCard />
          <KantaquizTeaser />
          {!hasMenuAccess ? (
            <>
              <BuzzerTeaser />
              <MatchDrinkTeaser />
            </>
          ) : null}
          {showReservationCard ? (
            <div id="prossima-prenotazione" className="hash-scroll-target rounded-[2rem]">
              <ReservationCard reservation={primaryReservation} fallback={routeFallback} />
            </div>
          ) : null}

          <div id="ciurma-card" className="hash-scroll-target rounded-[2rem]">
            <PwaInstallCard />
            
            <div id="fidelity" className="hash-scroll-target rounded-[2rem] mt-5">
              <FidelityStatusCard
                title="FIDELITY TORTUGA"
                points={rewardProgress.points}
                progressPercent={rewardProgress.progressPercent}
                tierLabel={rewardProgress.loyaltyTier.label}
                tierImage={rewardProgress.loyaltyTier.image}
                tierDescription={rewardProgress.loyaltyTier.description}
                nextRewardLabel={rewardProgress.nextReward?.label}
                isVip={rewardProgress.isVip}
                activeCardCode={activeCardCode}
                qrLabel="QR ciurma Tortuga"
              />
            </div>
          </div>

          {showCouponCard ? (
            <div id="coupon" className="hash-scroll-target rounded-[2rem]">
              <ActiveCouponsCard
                coupons={activeCoupons}
                description=""
                emptyMessage="Nessun coupon attivo da spendere per ora."
              />
            </div>
          ) : null}
        </>
      ) : null}

      <ReviewsCard />
    </section>
  );
}

