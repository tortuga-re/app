"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { StatusBlock } from "@/components/status-block";
import { KantaquizTeaser } from "@/components/kantaquiz-teaser";
import { BuzzerTeaser } from "@/components/buzzer-teaser";
import { requestJson } from "@/lib/client";
import { tortugaInfoConfig } from "@/lib/config";
import type { CoopertoVenueHour, VenueResponse } from "@/lib/cooperto/types";
import { useHashScroll } from "@/lib/hash-scroll";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { formatDateTime } from "@/lib/utils";

type GroupedOpeningHour = {
  dayLabel: string;
  timeLabel: string;
  sortDay: number;
  sortTime: string;
};

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 5.15 12.8 19.8 19.8 0 0 1 2.08 4.09 2 2 0 0 1 4.07 2h3a2 2 0 0 1 2 1.72l.45 3a2 2 0 0 1-.57 1.7l-1.27 1.27a16 16 0 0 0 6.36 6.36l1.27-1.27a2 2 0 0 1 1.7-.57l3 .45A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .01 5.437 0 12.045c0 2.112.552 4.171 1.597 6.011L0 24l6.117-1.605a11.845 11.845 0 005.932 1.577h.005c6.604 0 12.039-5.436 12.043-12.045a11.8 11.8 0 00-3.525-8.514z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

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

const getDayLabel = (code: number) => dayLabelsByCode[code] ?? "giorno";

const formatDayRange = (startDay: number, endDay: number) => {
  if (startDay === endDay) {
    return getDayLabel(startDay);
  }

  return `da ${getDayLabel(startDay)} a ${getDayLabel(endDay)}`;
};

const isLateSaturdayAfterDinner = (hour: CoopertoVenueHour) => {
  const dayCode = getDayCode(hour);
  if (dayCode !== 6 || !hour.OraInizio) {
    return false;
  }

  const [startHour] = hour.OraInizio.split(":").map(Number);
  return Number.isFinite(startHour) && startHour >= 23;
};

const groupVenueHours = (hours?: CoopertoVenueHour[] | null): GroupedOpeningHour[] => {
  if (!hours?.length) {
    return [];
  }

  const slotsByTime = new Map<string, number[]>();

  for (const hour of hours.filter((entry) => !isLateSaturdayAfterDinner(entry))) {
    if (!hour.OraInizio || !hour.OraFine) {
      continue;
    }

    const timeKey = `${hour.OraInizio}|${hour.OraFine}`;
    const dayCode = getDayCode(hour);
    const existing = slotsByTime.get(timeKey) ?? [];

    if (!existing.includes(dayCode)) {
      existing.push(dayCode);
      slotsByTime.set(timeKey, existing);
    }
  }

  const grouped: GroupedOpeningHour[] = [];

  for (const [timeKey, dayCodes] of slotsByTime.entries()) {
    const [startTime] = timeKey.split("|");
    const sortedDays = [...dayCodes].sort((left, right) => left - right);

    let rangeStart = sortedDays[0];
    let rangeEnd = sortedDays[0];

    for (let index = 1; index <= sortedDays.length; index += 1) {
      const currentDay = sortedDays[index];

      if (currentDay === rangeEnd + 1) {
        rangeEnd = currentDay;
        continue;
      }

      grouped.push({
        dayLabel: formatDayRange(rangeStart, rangeEnd),
        timeLabel: timeKey.replace("|", " - "),
        sortDay: rangeStart,
        sortTime: startTime,
      });

      rangeStart = currentDay;
      rangeEnd = currentDay;
    }
  }

  return grouped.sort((left, right) => {
    if (left.sortDay !== right.sortDay) {
      return left.sortDay - right.sortDay;
    }

    return left.sortTime.localeCompare(right.sortTime);
  });
};

export function VenuesScreen() {
  return (
    <Suspense fallback={null}>
      <VenuesScreenContent />
    </Suspense>
  );
}

function VenuesScreenContent() {
  const [data, setData] = useState<VenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { hasAccess } = useOnPremiseAccess();
  const searchParams = useSearchParams();
  const simDay = searchParams.get("simDay");
  const currentDay = simDay ? parseInt(simDay, 10) : new Date().getDay();

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const response = await requestJson<VenueResponse>("/api/venues");
        setData(response);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Non siamo riusciti a caricare le sedi.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadVenues();
  }, []);

  const primaryVenue = useMemo(
    () => data?.venues.find((venue) => venue.isPrimary) ?? data?.venues[0] ?? null,
    [data],
  );
  const groupedOpeningHours = useMemo(
    () => groupVenueHours(primaryVenue?.hours?.Orari),
    [primaryVenue?.hours?.Orari],
  );
  const exceptions = primaryVenue?.hours?.Eccezioni ?? [];
  useHashScroll(`${loading}:${Boolean(primaryVenue)}:${groupedOpeningHours.length}`);

  return (
    <section className="space-y-5">
      {loading ? (
        <StatusBlock
          variant="loading"
          title="Sto leggendo gli orari del Tortuga"
          description="Recupero le aperture reali e le eventuali variazioni della settimana."
        />
      ) : null}

      {error ? (
        <StatusBlock
          variant="error"
          title="Info non disponibili"
          description={error}
        />
      ) : null}

      <div id="programmazione" className="panel hash-scroll-target rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Programmazione serale</p>
        </div>

        <div className="mt-4 grid gap-3">
          {tortugaInfoConfig.eveningProgram.map((event) => (
            <div
              key={`${event.day}-${event.title}`}
              className="panel-muted rounded-[1.45rem] px-4 pt-4 pb-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                {event.day}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {event.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {event.description}
              </p>

              {hasAccess && (
                <>
                  {event.day === "MERCOLEDÌ" && currentDay === 3 && (
                    <div className="mt-4">
                      <Link
                        href="/game/buzzer"
                        className="button-primary inline-flex min-h-10 items-center justify-center px-4 text-xs font-bold"
                      >
                        Accedi al gioco
                      </Link>
                    </div>
                  )}
                  {event.day === "GIOVEDÌ" && currentDay === 4 && (
                    <div className="mt-4">
                      <Link
                        href="/game/match-drink"
                        className="button-primary inline-flex min-h-10 items-center justify-center px-4 text-xs font-bold"
                      >
                        Accedi al gioco
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <KantaquizTeaser />
      <BuzzerTeaser />

      <div id="social" className="panel hash-scroll-target rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Social</p>
          <h2 className="text-xl font-semibold text-white">
            Segui Tortuga anche fuori bordo.
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Trovi aggiornamenti, serate e contenuti sui canali ufficiali.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6">
          {tortugaInfoConfig.socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-strong)] transition-all hover:scale-110 active:scale-95"
              aria-label={social.label}
            >
              {social.label === "Instagram" && <InstagramIcon />}
              {social.label === "Facebook" && <FacebookIcon />}
              {social.label === "TikTok" && <TikTokIcon />}
            </a>
          ))}
        </div>
      </div>

      {primaryVenue ? (
        <div id="quando-ci-trovi" className="panel hash-scroll-target rounded-[2rem] p-5">
          <div className="space-y-2">
            <p className="eyebrow">Quando ci trovi e fuori rotta</p>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              {groupedOpeningHours.length ? (
                <div className="grid gap-3">
                  {groupedOpeningHours.map((hour) => (
                    <div
                      key={`${hour.dayLabel}-${hour.timeLabel}`}
                      className="panel-muted rounded-[1.4rem] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-base font-semibold capitalize text-white">
                          {hour.dayLabel}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {hour.timeLabel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel-muted rounded-[1.4rem] px-4 py-4">
                  <p className="text-sm text-[var(--text-muted)]">
                    Nessun orario disponibile al momento.
                  </p>
                </div>
              )}
            </div>

            {exceptions.length > 0 && (
              <div className="space-y-3 border-t border-[rgba(255,216,156,0.08)] pt-4">
                <div className="grid gap-3">
                  {exceptions.map((exception, index) => (
                    <div
                      key={`${exception.Tipologia}-${index}`}
                      className="panel-muted rounded-[1.4rem] px-4 py-4"
                    >
                      <p className="text-base font-semibold text-white">
                        {exception.Tipologia || "Eccezione"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {exception.DataInizio
                          ? formatDateTime(exception.DataInizio)
                          : "Inizio non indicato"}
                        {" - "}
                        {exception.DataFine
                          ? formatDateTime(exception.DataFine)
                          : "Fine non indicata"}
                      </p>
                      {exception.MessaggioChiusura ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                          {exception.MessaggioChiusura}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div id="dove-siamo" className="panel hash-scroll-target rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Dove siamo e contatti</p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="panel-muted rounded-[1.5rem] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Indirizzo
            </p>
            <p className="mt-2 text-base font-semibold text-white">
              {tortugaInfoConfig.address}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-black/20">
          <iframe
            title="Mappa Tortuga Bay"
            src={tortugaInfoConfig.mapsEmbedUrl}
            className="h-64 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div id="indicazioni" className="hash-scroll-target">
            <a
              href={tortugaInfoConfig.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
            >
              Ottieni indicazioni
            </a>
          </div>

          <div id="contatti" className="hash-scroll-target flex items-center gap-6">
            <a
              href={tortugaInfoConfig.phoneHref}
              className="text-[var(--accent-strong)] transition-all hover:scale-110 active:scale-95"
              aria-label="Chiama"
            >
              <PhoneIcon />
            </a>
            <a
              href={tortugaInfoConfig.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-strong)] transition-all hover:scale-110 active:scale-95"
              aria-label="Scrivici su WhatsApp"
            >
              <WhatsAppIcon />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
