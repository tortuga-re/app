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
    const [startTime, endTime] = timeKey.split("|");
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
        timeLabel: `${startTime} - ${endTime}`,
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
          Info e serate
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Orari, indicazioni, programmazione e contatti ufficiali del Tortuga.
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
          <p className="eyebrow">Dove siamo</p>
          <p className="text-base font-semibold text-white">
            {tortugaInfoConfig.address}
          </p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Apri la mappa ufficiale di Tortuga e raggiungi subito la Isla Loca.
          </p>
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

        <a
          href={tortugaInfoConfig.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="button-primary mt-4 inline-flex min-h-11 items-center justify-center px-5 text-sm"
        >
          Ottieni indicazioni
        </a>
      </div>

      {primaryVenue ? (
        <div className="panel rounded-[2rem] p-5">
          <div className="space-y-3">
            <p className="eyebrow">Quando ci trovi</p>
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
              <p className="text-sm text-[var(--text-muted)]">
                Nessun orario disponibile al momento.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {primaryVenue ? (
        <div className="panel rounded-[2rem] p-5">
          <div className="space-y-3">
            <p className="eyebrow">Fuori rotta</p>
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
              <p className="text-sm text-[var(--text-muted)]">
                Nessuna variazione comunicata per i prossimi giorni.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="panel rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Programmazione serale</p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Consulta la pagina ufficiale della programmazione invernale per il
            calendario serate piu aggiornato.
          </p>
        </div>

        <div className="mt-4 rounded-[1.4rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Card predisposta: i contenuti dettagliati delle serate non sono stati
            importati automaticamente perche la pagina ufficiale non e risultata
            leggibile in modo affidabile da questo ambiente.
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
          <p className="eyebrow">Contatti</p>
          <p className="text-base font-semibold text-white">
            {tortugaInfoConfig.phoneNumber}
          </p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Telefono e WhatsApp sempre pronti per prenotazioni e informazioni.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={tortugaInfoConfig.phoneHref}
            className="button-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm"
          >
            Chiama Tortuga
          </a>
          <a
            href={tortugaInfoConfig.whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
          >
            Apri WhatsApp
          </a>
        </div>
      </div>

      <div className="panel rounded-[2rem] p-5">
        <div className="space-y-2">
          <p className="eyebrow">Social</p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Collegamenti predisposti: verranno attivati quando i link ufficiali
            saranno centralizzati in configurazione.
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
