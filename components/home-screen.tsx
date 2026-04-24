"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { StatusBlock } from "@/components/status-block";
import { requestJson } from "@/lib/client";
import type {
  CoopertoCoupon,
  ProfileResponse,
  UpcomingReservation,
} from "@/lib/cooperto/types";
import {
  getBirthdayInsight,
  getCouponDisplayCode,
  getCustomerRecencyInsight,
  getPrimaryUpcomingReservation,
  getProfilePoints,
  sortActiveCoupons,
} from "@/lib/customer-profile";
import {
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import { cn, formatDateTime } from "@/lib/utils";

type HomeHighlight =
  | {
      type: "reservation";
      eyebrow: string;
      title: string;
      description: string;
      actionHref: string;
      actionLabel: string;
      reservation: UpcomingReservation;
    }
  | {
      type: "birthday";
      eyebrow: string;
      title: string;
      description: string;
      actionHref: string;
      actionLabel: string;
    }
  | {
      type: "coupon";
      eyebrow: string;
      title: string;
      description: string;
      actionHref: string;
      actionLabel: string;
      coupon: CoopertoCoupon;
    }
  | {
      type: "booking";
      eyebrow: string;
      title: string;
      description: string;
      actionHref: string;
      actionLabel: string;
    };

const loadProfileData = async (email: string) => {
  const normalizedEmail = normalizeCustomerEmail(email);
  const params = new URLSearchParams({
    mode: "email",
    query: normalizedEmail,
  });

  return requestJson<ProfileResponse>(`/api/profile?${params.toString()}`);
};

function MainHighlightCard({ highlight }: { highlight: HomeHighlight }) {
  return (
    <div className="panel rounded-[2rem] p-5">
      <p className="eyebrow">{highlight.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
        {highlight.title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        {highlight.description}
      </p>

      {highlight.type === "reservation" ? (
        <div className="mt-4 rounded-[1.5rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-4">
          <p className="text-base font-semibold text-white">
            {formatDateTime(highlight.reservation.dateTime)}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {highlight.reservation.pax
              ? `${highlight.reservation.pax} persone`
              : "Numero persone non disponibile"}
            {highlight.reservation.roomName
              ? ` - ${highlight.reservation.roomName}`
              : ""}
          </p>
          <p className="mt-2 inline-flex rounded-full border border-[rgba(255,216,156,0.12)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {highlight.reservation.stateLabel}
          </p>
        </div>
      ) : null}

      {highlight.type === "coupon" ? (
        <div className="mt-4 rounded-[1.5rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Codice coupon
          </p>
          <p className="mt-1 break-all text-lg font-semibold text-white">
            {getCouponDisplayCode(highlight.coupon)}
          </p>
        </div>
      ) : null}

      <Link
        href={highlight.actionHref}
        className="button-primary mt-5 inline-flex min-h-12 items-center justify-center px-5 text-sm"
      >
        {highlight.actionLabel}
      </Link>
    </div>
  );
}

function SecondaryCard({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel rounded-[2rem] p-5", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        {children}
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
  const points = getProfilePoints(profile);
  const rewardProgress = getFidelityRewardProgress(points);
  const activeCoupons = useMemo(
    () => sortActiveCoupons(profile?.coupons ?? []),
    [profile?.coupons],
  );
  const primaryReservation = getPrimaryUpcomingReservation(profile);
  const birthdayInsight = getBirthdayInsight(profile?.contact?.DataDiNascita);
  const recencyInsight = getCustomerRecencyInsight(
    profile?.contact,
    rewardProgress,
  );
  const activeCardCode = profile?.contact?.CodiceCard?.trim() || "";
  const visits = profile?.contact?.NumeroVisite;
  const lastVisit = profile?.contact?.DataUltimaVisita;

  const highlightCandidates: HomeHighlight[] = [
    ...(primaryReservation
      ? [
          {
            type: "reservation" as const,
            eyebrow: "Prossima prenotazione",
            title: "La tua prossima serata e in rotta.",
            description:
              "Tieni a portata di mano dettagli e stato della prenotazione.",
            actionHref: "/ciurma",
            actionLabel: "Apri la tua ciurma",
            reservation: primaryReservation,
          },
        ]
      : []),
    ...(birthdayInsight
      ? [
          {
            type: "birthday" as const,
            eyebrow: "Regalo compleanno",
            title: birthdayInsight.isToday
              ? "Oggi si festeggia al Tortuga."
              : `Compleanno vicino: ${birthdayInsight.label}`,
            description: birthdayInsight.isToday
              ? "La data di nascita e attiva: controlla in ciurma i dati aggiornati."
              : `Mancano ${birthdayInsight.daysUntil} giorni: la data e pronta per eventuali iniziative compleanno reali.`,
            actionHref: "/ciurma",
            actionLabel: "Controlla la ciurma",
          },
        ]
      : []),
    ...(activeCoupons[0]
      ? [
          {
            type: "coupon" as const,
            eyebrow: "Coupon attivo",
            title: "Hai un codice pronto da usare.",
            description:
              "Mostralo quando serve: il codice arriva dai dati fidelity Cooperto.",
            actionHref: "/ciurma",
            actionLabel: "Mostra fidelity",
            coupon: activeCoupons[0],
          },
        ]
      : []),
    {
      type: "booking",
      eyebrow: "Prenotazione rapida",
      title: identityEmail ? "Prenota di nuovo in pochi tocchi." : "Prenota la tua rotta.",
      description: identityEmail
        ? "Useremo i dati cliente salvati per precompilare il flusso dove possibile."
        : "Scegli data, persone e orario: potrai salvare i dati cliente durante la prenotazione.",
      actionHref: "/prenota",
      actionLabel: "Prenota ora",
    },
  ];
  const mainHighlight = highlightCandidates[0];
  const secondaryHighlights = highlightCandidates.slice(1, 3);

  return (
    <section className="space-y-5">
      <div className="panel rounded-[2rem] px-5 py-4">
        <p className="eyebrow">Home</p>
        <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.08em] text-white">
          Dashboard Tortuga
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Prenotazioni, fidelity e contatti sempre a portata di mano.
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
          title="Dashboard parziale"
          description={error}
        />
      ) : null}

      {!loading ? <MainHighlightCard highlight={mainHighlight} /> : null}

      {!loading && secondaryHighlights.length > 0 ? (
        <div className="grid gap-3">
          {secondaryHighlights.map((highlight) => (
            <SecondaryCard
              key={highlight.type}
              eyebrow={highlight.eyebrow}
              title={highlight.title}
            >
              <p>{highlight.description}</p>
              <Link
                href={highlight.actionHref}
                className="button-secondary mt-4 inline-flex min-h-11 items-center justify-center px-4 text-sm"
              >
                {highlight.actionLabel}
              </Link>
            </SecondaryCard>
          ))}
        </div>
      ) : null}

      {!loading ? (
        <div className="grid gap-3">
          <SecondaryCard eyebrow="Saldo punti" title={`${rewardProgress.points} punti`}>
            <div className="space-y-3">
              <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f7e0b2_0%,#d5a65b_52%,#8d6330_100%)] transition-[width] duration-500"
                  style={{ width: `${rewardProgress.progressPercent}%` }}
                />
              </div>
              <p>
                Livello:{" "}
                <span className="font-semibold text-white">
                  {rewardProgress.loyaltyTier.label}
                </span>
              </p>
              {rewardProgress.nextReward ? (
                <p>
                  Prossimo premio:{" "}
                  <span className="text-white">
                    {rewardProgress.nextReward.label}
                  </span>
                </p>
              ) : (
                <p>Premio finale fidelity gia raggiunto.</p>
              )}
            </div>
          </SecondaryCard>

          {activeCardCode ? (
            <SecondaryCard eyebrow="QR fidelity" title="Card pronta">
              <div className="mx-auto max-w-[190px]">
                <FidelityQrCode
                  value={activeCardCode}
                  label="QR fidelity Tortuga"
                  variant={rewardProgress.isVip ? "vip" : "default"}
                />
              </div>
            </SecondaryCard>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <SecondaryCard
              eyebrow="Coupon"
              title={activeCoupons.length ? `${activeCoupons.length} attivi` : "Nessun coupon attivo"}
            >
              {activeCoupons.length ? (
                <p>
                  Primo codice:{" "}
                  <span className="break-all text-white">
                    {getCouponDisplayCode(activeCoupons[0])}
                  </span>
                </p>
              ) : (
                <p>Non risultano coupon attivi per questa email.</p>
              )}
            </SecondaryCard>

            <SecondaryCard
              eyebrow="Visite"
              title={typeof visits === "number" ? String(visits) : "Non disponibili"}
            >
              {lastVisit ? (
                <p>
                  Ultima visita:{" "}
                  <span className="text-white">{formatDateTime(lastVisit)}</span>
                </p>
              ) : (
                <p>Nessuna ultima visita disponibile dai dati Cooperto.</p>
              )}
            </SecondaryCard>
          </div>

          {recencyInsight ? (
            <SecondaryCard eyebrow="Engagement" title={recencyInsight.label}>
              <p>{recencyInsight.description}</p>
              <p className="mt-2">
                Giorni dall&apos;ultima visita:{" "}
                <span className="text-white">
                  {recencyInsight.daysSinceLastVisit}
                </span>
              </p>
            </SecondaryCard>
          ) : null}

          <div className="panel rounded-[2rem] p-5">
            <p className="eyebrow">Azioni rapide</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/prenota"
                className="button-primary inline-flex min-h-12 items-center justify-center px-4 text-sm"
              >
                Prenota ora
              </Link>
              <Link
                href="/ciurma"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-4 text-sm"
              >
                Apri la tua ciurma
              </Link>
              <Link
                href="/ciurma"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-4 text-sm"
              >
                Mostra fidelity
              </Link>
              <Link
                href="/info"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-4 text-sm"
              >
                Contatti e indicazioni
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
