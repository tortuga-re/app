"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";
import { StatusBlock } from "@/components/status-block";

const FidelityStatusCard = dynamic(() => import("@/components/fidelity-status-card").then(mod => mod.FidelityStatusCard), { ssr: false });
const KantaquizTeaser = dynamic(() => import("@/components/kantaquiz-teaser").then(mod => mod.KantaquizTeaser), { ssr: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LiveTvContributionCard = dynamic<any>(() => import("@/features/live-tv/components/LiveTvContributionCard").then(mod => mod.LiveTvContributionCard).catch(() => ({ default: () => null } as any)), { ssr: false });
const ReservationCard = dynamic(() => import("@/components/reservation-card").then(mod => mod.ReservationCard), { ssr: false });
const SmartHeroCard = dynamic(() => import("@/components/smart-hero-card").then(mod => mod.SmartHeroCard), { ssr: false });
const VenueModeCard = dynamic(() => import("@/components/venue-mode-card").then(mod => mod.VenueModeCard), { ssr: false });
const ReviewsCard = dynamic(() => import("@/components/reviews-card").then(mod => mod.ReviewsCard), { ssr: false });
const VenueScannerCard = dynamic(() => import("@/components/venue-scanner-card").then(mod => mod.VenueScannerCard), { ssr: false });

import { trackAppEvent } from "@/lib/analytics";
import { requestJson } from "@/lib/client";
import type {
  ProfileResponse,
  VenueResponse,
  CoopertoVenueHour,
  CoopertoVenueException,
} from "@/lib/cooperto/types";
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
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { PwaInstallCard } from "@/components/pwa-install-card";
import { useVisitRegistration } from "@/lib/hooks/use-visit-registration";
import type { RouteFallback } from "@/components/reservation-card";
import { LoyaltyJourney } from "@/components/loyalty-journey";
import { getRomeTime, getRomeWeekday } from "@/lib/utils";

const loadProfileData = async (email: string) => {
  const normalizedEmail = normalizeCustomerEmail(email);
  const params = new URLSearchParams({
    mode: "email",
    query: normalizedEmail,
  });

  return requestJson<ProfileResponse>(`/api/profile?${params.toString()}`);
};

const defaultHours: CoopertoVenueHour[] = [
  { CodiceGiorno: 2, Giorno: "Martedi", OraInizio: "19:00", OraFine: "23:30" },
  { CodiceGiorno: 3, Giorno: "Mercoledi", OraInizio: "19:00", OraFine: "23:30" },
  { CodiceGiorno: 4, Giorno: "Giovedi", OraInizio: "19:00", OraFine: "23:30" },
  { CodiceGiorno: 5, Giorno: "Venerdi", OraInizio: "19:00", OraFine: "00:30" },
  { CodiceGiorno: 6, Giorno: "Sabato", OraInizio: "19:00", OraFine: "00:30" },
  { CodiceGiorno: 7, Giorno: "Domenica", OraInizio: "12:30", OraFine: "15:00" },
  { CodiceGiorno: 7, Giorno: "Domenica", OraInizio: "19:00", OraFine: "23:00" },
];

const dayLabelsByCode: Record<number, string> = {
  1: "lunedi",
  2: "martedi",
  3: "mercoledi",
  4: "giovedi",
  5: "venerdi",
  6: "sabato",
  7: "domenica",
};

const normalizedDayMap: Record<string, number> = {
  lunedi: 1,
  martedi: 2,
  mercoledi: 3,
  giovedi: 4,
  venerdi: 5,
  sabato: 6,
  domenica: 7,
};

const normalizeDayName = (value?: string) =>
  value
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") ?? "";

const getDayCode = (hour: CoopertoVenueHour) => {
  if (hour.CodiceGiorno && dayLabelsByCode[hour.CodiceGiorno]) {
    return hour.CodiceGiorno;
  }

  const normalized = normalizeDayName(hour.Giorno);
  return normalizedDayMap[normalized] ?? 99;
};

function isVenueOpen(
  now: Date,
  hours: CoopertoVenueHour[],
  exceptions: CoopertoVenueException[],
): boolean {
  for (const exc of exceptions) {
    if (exc.DataInizio && exc.DataFine) {
      const start = new Date(exc.DataInizio);
      const end = new Date(exc.DataFine);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && now >= start && now <= end) {
        return false;
      }
    }
  }

  const getCoopertoDayCode = (day: number): number => (day === 0 ? 7 : day);
  const nowDay = getCoopertoDayCode(getRomeWeekday(now));
  const yesterdayDay = nowDay === 1 ? 7 : nowDay - 1;
  const currentTime = getRomeTime(now);

  for (const hour of hours) {
    if (!hour.OraInizio || !hour.OraFine) continue;

    const slotDay = getDayCode(hour);
    if (!slotDay || slotDay === 99) continue;

    const [startHour, startMin] = hour.OraInizio.split(":").map(Number);
    const [endHour, endMin] = hour.OraFine.split(":").map(Number);

    if (
      isNaN(startHour) || isNaN(startMin) ||
      isNaN(endHour) || isNaN(endMin)
    ) {
      continue;
    }

    const wraps = endHour < startHour || (endHour === startHour && endMin < startMin);

    const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

    if (slotDay === nowDay && !wraps && currentTime >= startTime && currentTime < endTime) return true;
    if (slotDay === nowDay && wraps && currentTime >= startTime) return true;
    if (slotDay === yesterdayDay && wraps && currentTime < endTime) return true;
  }

  return false;
}

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

export function HomeScreen() {
  const { identity } = useCustomerIdentity();
  const { registerVisit } = useVisitRegistration();
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
  const [venueHours, setVenueHours] = useState<{
    orari: CoopertoVenueHour[];
    eccezioni: CoopertoVenueException[];
  } | null>(null);
  const [now, setNow] = useState<Date | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    const loadVenues = async () => {
      try {
        const response = await requestJson<VenueResponse>("/api/venues");
        if (cancelled) return;
        const primaryVenue = response?.venues.find((v) => v.isPrimary) ?? response?.venues[0] ?? null;
        if (primaryVenue?.hours) {
          setVenueHours({
            orari: primaryVenue.hours.Orari ?? [],
            eccezioni: primaryVenue.hours.Eccezioni ?? [],
          });
        }
      } catch (err) {
        console.error("Errore caricamento orari sede:", err);
      }
    };
    void loadVenues();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNow(new Date());
    }, 0);

    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const orari = venueHours?.orari ?? defaultHours;
  const eccezioni = venueHours?.eccezioni ?? [];
  const isOpen = now ? isVenueOpen(now, orari, eccezioni) : false;

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
          : activeCoupons.length > 0 ? "coupon" : "default";

    trackAppEvent("home_context_view", {
      app_section: "home",
      home_context: context,
      has_menu_access: hasMenuAccess,
    });
  }, [
    activeCoupons.length,
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
      active_coupon_count: activeCoupons.length,
      has_reservation: Boolean(primaryReservation),
    });
  }, [
    activeCoupons.length,
    hasMenuAccess,
    loading,
    primaryReservation,
  ]);

  const showHeroCard = !hasMenuAccess && !primaryReservation;
  const showReservationCard = !hasMenuAccess && Boolean(primaryReservation);

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
          <LoyaltyJourney />
          {hasMenuAccess ? (
            <>
              <VenueModeCard onOpenMenu={() => void registerVisit(profile?.contact?.CodiceContatto)} />
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
            />
          ) : null}
          {!hasMenuAccess && isOpen ? (
            <VenueScannerCard
              onScanSuccess={() => void registerVisit(profile?.contact?.CodiceContatto)}
            />
          ) : null}
          <div className="secondary-experiences"><KantaquizTeaser /></div>
          {showReservationCard ? (
            <div id="prossima-prenotazione" className="hash-scroll-target rounded-[2rem]">
              <ReservationCard reservation={primaryReservation} fallback={routeFallback} />
            </div>
          ) : null}

          <div id="ciurma-card" className="hash-scroll-target rounded-[2rem] secondary-experiences">
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

        </>
      ) : null}

      <div className="secondary-experiences"><ReviewsCard /></div>
    </section>
  );
}
