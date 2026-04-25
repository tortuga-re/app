"use client";

import { useEffect, useRef, useState } from "react";

import { ActiveCouponsCard } from "@/components/active-coupons-card";
import { FidelityStatusCard } from "@/components/fidelity-status-card";
import { StatusBlock } from "@/components/status-block";
import { CaptainChallengeTeaser } from "@/features/game/components/CaptainChallengeTeaser";
import { requestJson } from "@/lib/client";
import { ciurmaRoadmapFeatures } from "@/lib/config";
import {
  formatBirthDateLabel,
  getProfileUpcomingReservations,
  sortActiveCoupons,
  toDateInputValue,
} from "@/lib/customer-profile";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { triggerHaptic } from "@/lib/haptics";
import { formatDateTime } from "@/lib/utils";

type ContactFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  marketingConsent: boolean;
};

const emptyContactForm: ContactFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  birthDate: "",
  marketingConsent: false,
};

const loadProfileData = async (email: string) => {
  const normalizedEmail = normalizeCustomerEmail(email);
  const params = new URLSearchParams({
    mode: "email",
    query: normalizedEmail,
  });

  return requestJson<ProfileResponse>(`/api/profile?${params.toString()}`);
};

const buildContactForm = (
  contact: ProfileResponse["contact"] | undefined,
): ContactFormState => ({
  firstName: contact?.Nome?.trim() ?? "",
  lastName: contact?.Cognome?.trim() ?? "",
  phone: contact?.Telefono?.trim() ?? "",
  email: normalizeCustomerEmail(contact?.Email),
  birthDate: toDateInputValue(contact?.DataDiNascita),
  marketingConsent: contact?.ConsensoMarketing === 1,
});

export function CiurmaScreen() {
  const {
    identity,
    hasIdentity,
    setIdentityFromEmail,
    updateIdentity,
    clearCustomerContext,
  } = useCustomerIdentity();
  const [lookupEmail, setLookupEmail] = useState("");
  const [isEditingLookup, setIsEditingLookup] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContactForm);
  const autoLoadedKeyRef = useRef("");

  const identityEmail = normalizeCustomerEmail(identity.email);
  const hasProfile = Boolean(data?.contact);
  const points = data?.points ?? data?.contact?.SaldoPuntiCard ?? 0;
  const activeCoupons = sortActiveCoupons(data?.coupons ?? []);
  const reservationOwnerEmail = identityEmail || normalizeCustomerEmail(lookupEmail);
  const upcomingReservations = getProfileUpcomingReservations(
    data,
    reservationOwnerEmail,
  );
  const rewardProgress = getFidelityRewardProgress(points);
  const activeCardCode = data?.contact?.CodiceCard?.trim() || "";
  const profileName =
    [data?.contact?.Nome, data?.contact?.Cognome].filter(Boolean).join(" ") ||
    "Cliente Tortuga";
  const lastVisit = data?.contact?.DataUltimaVisita;
  const showLookupPanel = isEditingLookup || !hasIdentity;
  const contactSnapshot = buildContactForm(data?.contact ?? undefined);

  useEffect(() => {
    if (!identityEmail || isEditingLookup || hasProfile) {
      return;
    }

    if (autoLoadedKeyRef.current === identityEmail) {
      return;
    }

    autoLoadedKeyRef.current = identityEmail;
    let cancelled = false;

    const loadSavedProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await loadProfileData(identityEmail);

        if (cancelled) {
          return;
        }

        if (!response.contact) {
          setData(response);
          setLookupEmail(identityEmail);
          setIsEditingLookup(true);
          autoLoadedKeyRef.current = "";
          return;
        }

        setData(response);
        updateIdentity({
          email: response.contact.Email || identityEmail,
          firstName: response.contact.Nome,
          lastName: response.contact.Cognome,
          phone: response.contact.Telefono,
          marketingConsent:
            typeof response.contact.ConsensoMarketing === "number"
              ? response.contact.ConsensoMarketing === 1
              : undefined,
        });
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setData(null);
        setLookupEmail(identityEmail);
        setIsEditingLookup(true);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Non sono riuscito a recuperare la tua ciurma.",
        );
        autoLoadedKeyRef.current = "";
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSavedProfile();

    return () => {
      cancelled = true;
    };
  }, [hasProfile, identityEmail, isEditingLookup, updateIdentity]);

  const applyProfileResponse = (response: ProfileResponse) => {
    setData(response);
    setLookupEmail(response.contact?.Email || response.query);

    if (!response.contact) {
      return;
    }

    updateIdentity({
      email: response.contact.Email || response.query,
      firstName: response.contact.Nome,
      lastName: response.contact.Cognome,
      phone: response.contact.Telefono,
      marketingConsent:
        typeof response.contact.ConsensoMarketing === "number"
          ? response.contact.ConsensoMarketing === 1
          : undefined,
    });
  };

  const runLookup = async () => {
    const normalizedEmail = normalizeCustomerEmail(lookupEmail);

    if (!normalizedEmail) {
      setError("Inserisci un'email valida.");
      return;
    }

    if (!isValidCustomerEmail(normalizedEmail)) {
      setError("Inserisci un indirizzo email valido.");
      return;
    }

    autoLoadedKeyRef.current = normalizedEmail;
    setIdentityFromEmail(normalizedEmail);
    setLoading(true);
    setError("");

    try {
      const response = await loadProfileData(normalizedEmail);
      setData(response);
      setLookupEmail(normalizedEmail);

      if (response.contact) {
        updateIdentity({
          email: response.contact.Email || normalizedEmail,
          firstName: response.contact.Nome,
          lastName: response.contact.Cognome,
          phone: response.contact.Telefono,
          marketingConsent:
            typeof response.contact.ConsensoMarketing === "number"
              ? response.contact.ConsensoMarketing === 1
              : undefined,
        });
        setIsEditingLookup(false);
        autoLoadedKeyRef.current = normalizedEmail;
      } else {
        setIsEditingLookup(true);
        autoLoadedKeyRef.current = "";
      }
    } catch (loadError) {
      setIsEditingLookup(true);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Non sono riuscito a recuperare la tua ciurma.",
      );
      autoLoadedKeyRef.current = "";
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async () => {
    const normalizedEmail = normalizeCustomerEmail(contactForm.email);

    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
      setContactError("Inserisci nome e cognome.");
      return;
    }

    if (!normalizedEmail || !isValidCustomerEmail(normalizedEmail)) {
      setContactError("Inserisci un indirizzo email valido.");
      return;
    }

    if (!contactForm.phone.trim()) {
      setContactError("Inserisci un numero di telefono valido.");
      return;
    }

    setSavingContact(true);
    setContactError("");
    setContactMessage("");

    try {
      const response = await requestJson<ProfileResponse>("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          firstName: contactForm.firstName.trim(),
          lastName: contactForm.lastName.trim(),
          phone: contactForm.phone.trim(),
          email: normalizedEmail,
          birthDate: contactForm.birthDate || undefined,
          marketingConsent: contactForm.marketingConsent,
        }),
      });

      applyProfileResponse(response);
      setContactForm((current) => ({
        ...current,
        email: normalizedEmail,
      }));
      setIsEditingProfile(false);
      setContactMessage("Dati cliente aggiornati.");
      autoLoadedKeyRef.current = normalizedEmail;
    } catch (saveError) {
      setContactError(
        saveError instanceof Error
          ? saveError.message
          : "Non sono riuscito a salvare i dati cliente.",
      );
    } finally {
      setSavingContact(false);
    }
  };

  const openContactEditor = () => {
    setContactError("");
    setContactMessage("");
    setContactForm(contactSnapshot);
    setIsEditingProfile(true);
  };

  const changeAccount = () => {
    clearCustomerContext();
    setLookupEmail("");
    setData(null);
    setError("");
    setIsEditingLookup(true);
    setIsEditingProfile(false);
    setContactForm(emptyContactForm);
    setContactError("");
    setContactMessage("");
    autoLoadedKeyRef.current = "";
  };

  return (
    <section className="space-y-5">
      {showLookupPanel ? (
        <div className="panel rounded-[2rem] p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="eyebrow">Riconoscimento ciurma</p>
              <h2 className="text-xl font-semibold text-white">Rientra a bordo con la tua email.</h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Recupera subito bottino, coupon e prenotazioni gia legate al tuo profilo.
              </p>
            </div>

            <input
              className="field"
              type="email"
              placeholder="cliente@email.it"
              value={lookupEmail}
              onChange={(event) => setLookupEmail(event.target.value)}
            />
            <button
              type="button"
              className="button-primary flex min-h-12 w-full items-center justify-center px-4"
              onClick={() => {
                triggerHaptic();
                void runLookup();
              }}
              disabled={loading}
            >
              {loading ? "Recupero la ciurma..." : "Entra nella tua area"}
            </button>
          </div>
        </div>
      ) : null}

      {loading && !hasProfile ? (
        <StatusBlock
          variant="loading"
          title="Sto recuperando la tua ciurma"
          description="Uso la tua email per riportarti subito dentro il tuo profilo."
        />
      ) : null}

      {error ? (
        <StatusBlock
          variant="error"
          title="Ricerca non riuscita"
          description={error}
        />
      ) : null}

      {!loading && !hasProfile && !showLookupPanel ? (
        <StatusBlock
          variant="info"
          title="Ciurma non disponibile"
          description="L'email salvata non ha restituito dati validi. Puoi cambiare account e riprovare."
          action={
            <button
              type="button"
              className="button-secondary inline-flex min-h-11 items-center justify-center px-5"
              onClick={() => {
                triggerHaptic();
                changeAccount();
              }}
            >
              Cambia account
            </button>
          }
        />
      ) : null}

      {data && !data.contact ? (
        <StatusBlock
          variant="empty"
          title="Contatto non trovato"
          description="Cooperto non ha restituito dati per questa email. Controlla l'indirizzo inserito o prova con un altro account."
        />
      ) : null}

      {data?.contact ? (
        <>
          <div className="panel rounded-[2rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="eyebrow">Membro della ciurma</p>
                <h2 className="text-2xl font-semibold text-white">{profileName}</h2>
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  Qui tieni in ordine i dati che contano davvero quando torni a bordo.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="button-secondary inline-flex min-h-11 items-center justify-center px-4 text-sm"
                  onClick={() => {
                    triggerHaptic();
                    if (isEditingProfile) {
                      setIsEditingProfile(false);
                      setContactError("");
                      setContactMessage("");
                      return;
                    }

                    openContactEditor();
                  }}
                >
                  {isEditingProfile ? "Chiudi modifiche" : "Modifica dati"}
                </button>
                <button
                  type="button"
                  className="button-secondary inline-flex min-h-11 items-center justify-center px-4 text-sm"
                  onClick={() => {
                    triggerHaptic();
                    changeAccount();
                  }}
                >
                  Cambia profilo
                </button>
              </div>
            </div>

            {contactError ? (
              <div className="mt-4 rounded-[1.4rem] border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                {contactError}
              </div>
            ) : null}

            {contactMessage ? (
              <div className="mt-4 rounded-[1.4rem] border border-[rgba(216,176,106,0.14)] bg-[rgba(216,176,106,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]">
                {contactMessage}
              </div>
            ) : null}

            {isEditingProfile ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-[var(--text-muted)]">
                    <span>Nome</span>
                    <input
                      className="field"
                      value={contactForm.firstName}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="space-y-2 text-sm text-[var(--text-muted)]">
                    <span>Cognome</span>
                    <input
                      className="field"
                      value={contactForm.lastName}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-[var(--text-muted)]">
                    <span>Email</span>
                    <input
                      className="field"
                      type="email"
                      value={contactForm.email}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="space-y-2 text-sm text-[var(--text-muted)]">
                    <span>Telefono</span>
                    <input
                      className="field"
                      type="tel"
                      value={contactForm.phone}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm text-[var(--text-muted)]">
                  <span>Data di nascita</span>
                  <input
                    className="field"
                    type="date"
                    value={contactForm.birthDate}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="flex items-start gap-3 rounded-[1.4rem] border border-[rgba(171,128,63,0.16)] bg-white/4 px-4 py-3 text-sm text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={contactForm.marketingConsent}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        marketingConsent: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    Accetto comunicazioni marketing future di Tortuga.
                  </span>
                </label>

                <button
                  type="button"
                  className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
                  onClick={() => {
                    triggerHaptic();
                    void saveContact();
                  }}
                  disabled={savingContact}
                >
                  {savingContact ? "Salvo le modifiche..." : "Salva modifiche"}
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Nome e cognome
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{profileName}</p>
                </div>

                <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Contatti
                  </p>
                  <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--text-muted)]">
                    <p>
                      Email:{" "}
                      <span className="text-white">
                        {contactSnapshot.email || "Non disponibile"}
                      </span>
                    </p>
                    <p>
                      Telefono:{" "}
                      <span className="text-white">
                        {contactSnapshot.phone || "Non disponibile"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Data di nascita
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {contactSnapshot.birthDate
                      ? formatBirthDateLabel(contactSnapshot.birthDate)
                      : "Non disponibile"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <FidelityStatusCard
            title="Fidelity Tortuga"
            points={rewardProgress.points}
            progressPercent={rewardProgress.progressPercent}
            tierLabel={rewardProgress.loyaltyTier.label}
            tierDescription={rewardProgress.loyaltyTier.description}
            nextRewardLabel={rewardProgress.nextReward?.label}
            isVip={rewardProgress.isVip}
            activeCardCode={activeCardCode}
            qrLabel={`QR fidelity di ${profileName}`}
          />

          <div className="panel rounded-[2rem] p-5">
            <div className="space-y-2">
              <p className="eyebrow">Le tue rotte</p>
              <h2 className="text-2xl font-semibold text-white">
                Prenotazioni in arrivo e ultimo passaggio.
              </h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Qui restano solo le rotte che ti servono davvero.
              </p>
            </div>

            {upcomingReservations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {upcomingReservations.map((reservation) => (
                  <div
                    key={`${reservation.reservationCode ?? reservation.dateTime}-${reservation.stateLabel}`}
                    className="panel-muted rounded-[1.5rem] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-white">
                          {formatDateTime(reservation.dateTime)}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {reservation.pax
                            ? `${reservation.pax} persone`
                            : "Numero persone non disponibile"}
                        </p>
                        {reservation.roomName ? (
                          <p className="text-sm text-[var(--text-muted)]">
                            Sala: <span className="text-white">{reservation.roomName}</span>
                          </p>
                        ) : null}
                      </div>

                      <span className="rounded-full border border-[rgba(171,128,63,0.18)] bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                        {reservation.stateLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.5rem] border border-[rgba(171,128,63,0.18)] bg-white/4 px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                Nessuna prenotazione futura trovata al momento.
              </div>
            )}

            {lastVisit ? (
              <div className="mt-4 rounded-[1.5rem] border border-[rgba(171,128,63,0.18)] bg-white/4 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Ultima visita
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {formatDateTime(lastVisit)}
                </p>
              </div>
            ) : null}
          </div>

          <ActiveCouponsCard
            coupons={activeCoupons}
            description=""
            emptyMessage="Nessun coupon attivo da spendere per ora."
          />

          <div className="panel rounded-[2rem] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="eyebrow">Sfide e contenuti</p>
                <h2 className="text-2xl font-semibold text-white">
                  Quello che succede quando torni davvero a bordo.
                </h2>
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  Sfide, inviti e contenuti speciali pensati per chi gioca sul serio.
                </p>
              </div>

              <span className="rounded-full border border-[rgba(171,128,63,0.18)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Esclusive
              </span>
            </div>

            <div className="mt-4 rounded-[1.7rem] border border-[rgba(171,128,63,0.18)] bg-white/4 px-4 py-4">
              <CaptainChallengeTeaser compact framed={false} />
            </div>

            <div className="mt-4 grid gap-3">
              {ciurmaRoadmapFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="panel-muted rounded-[1.5rem] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white">
                        {feature.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        {feature.description}
                      </p>
                    </div>
                    <span className="rounded-full border border-[rgba(171,128,63,0.14)] bg-white/4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      A bordo presto
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export const ProfileScreen = CiurmaScreen;
