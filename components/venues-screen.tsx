"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { requestJson } from "@/lib/client";
import { tortugaInfoConfig } from "@/lib/config";
import type { CoopertoVenueHour, VenueResponse } from "@/lib/cooperto/types";
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
      className="h-4 w-4"
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
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 11.5a8 8 0 0 1-11.8 7.02L4 20l1.6-4.01A8 8 0 1 1 20 11.5Z" />
      <path d="M9.6 8.9c-.2-.44-.4-.45-.58-.46h-.5c-.18 0-.47.07-.72.34s-.95.93-.95 2.28 1 2.66 1.13 2.84c.14.18 1.92 3.08 4.74 4.19 2.34.92 2.82.74 3.32.69.5-.04 1.61-.66 1.83-1.3.23-.65.23-1.2.16-1.3-.07-.1-.27-.16-.57-.31s-1.78-.88-2.06-.98c-.27-.1-.48-.15-.68.16s-.77.98-.95 1.18c-.18.21-.36.23-.66.08-.3-.15-1.29-.48-2.46-1.53-.91-.81-1.53-1.8-1.71-2.1-.18-.3-.02-.46.13-.61.14-.14.3-.36.45-.54.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.54-.08-.15-.67-1.72-.93-2.29Z" />
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
  const [data, setData] = useState<VenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <section className="space-y-5">
      <div className="panel rounded-[2rem] px-5 py-4">
        <p className="eyebrow">Info e serate</p>
        <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.08em] text-white">
          INFO E SERATE
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Tutto quello che ti serve per raggiungere Tortuga e scegliere la serata giusta.
        </p>
      </div>

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

      <div className="panel rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Dove siamo e contatti</p>
          <h2 className="text-xl font-semibold text-white">
            Arriva al Tortuga senza deviazioni.
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Indirizzo e contatti rapidi restano in un unico punto.
          </p>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={tortugaInfoConfig.phoneHref}
              className="button-secondary inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm"
            >
              <PhoneIcon />
              <span>CHIAMA</span>
            </a>
            <a
              href={tortugaInfoConfig.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="button-secondary inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm"
            >
              <WhatsAppIcon />
              <span>Scrivici</span>
            </a>
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

        <div className="mt-4">
          <a
            href={tortugaInfoConfig.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
          >
            Ottieni indicazioni
          </a>
        </div>
      </div>

      {primaryVenue ? (
        <div className="panel rounded-[2rem] p-5">
          <div className="space-y-2">
            <p className="eyebrow">Quando ci trovi e fuori rotta</p>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Quando ci trovi
              </p>
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

            <div className="space-y-3 border-t border-[rgba(255,216,156,0.08)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Fuori rotta
              </p>
              {exceptions.length ? (
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
              ) : (
                <div className="panel-muted rounded-[1.4rem] px-4 py-4">
                  <p className="text-sm text-[var(--text-muted)]">
                    Nessuna variazione comunicata per i prossimi giorni.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="panel rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Programmazione serale</p>
          <h2 className="text-xl font-semibold text-white">
            La serata la scegli dalla fonte ufficiale.
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Il calendario viene aperto direttamente dalla pagina Tortuga piu aggiornata.
          </p>
        </div>

        <div className="mt-4 rounded-[1.4rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            La programmazione dettagliata resta collegata alla pagina ufficiale per
            evitare copie parziali o non aggiornate.
          </p>
        </div>

        <a
          href={tortugaInfoConfig.programmazioneUrl}
          target="_blank"
          rel="noreferrer"
          className="button-secondary mt-4 inline-flex min-h-11 items-center justify-center px-5 text-sm"
        >
          Apri programmazione
        </a>
      </div>

      <div className="panel rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Social</p>
          <h2 className="text-xl font-semibold text-white">
            Segui Tortuga anche fuori bordo.
          </h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            I link arrivano dalla configurazione centrale, con placeholder puliti quando mancano.
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {tortugaInfoConfig.socialLinks.map((social) =>
            social.href ? (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="button-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm"
              >
                {social.label}
              </a>
            ) : (
              <div
                key={social.label}
                className="rounded-[1.4rem] border border-[rgba(255,216,156,0.1)] bg-white/4 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{social.label}</p>
                  <span className="rounded-full border border-[rgba(255,216,156,0.1)] bg-white/4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Da collegare
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
