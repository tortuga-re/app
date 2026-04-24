"use client";

import { useEffect, useRef, useState } from "react";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { StatusBlock } from "@/components/status-block";
import { requestJson } from "@/lib/client";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { cn, formatDateTime } from "@/lib/utils";

type ContactFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  marketingConsent: boolean;
};

type EditableContactSection = "identity" | "contacts" | "birthDate";

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

const toDateInputValue = (value?: string) => {
  if (!value) {
    return "";
  }

  const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (directMatch) {
    return directMatch[0];
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "";
  }

  return new Date(timestamp).toISOString().slice(0, 10);
};

const formatBirthDateLabel = (value?: string) => {
  const dateValue = toDateInputValue(value);
  if (!dateValue) {
    return "Non disponibile";
  }

  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
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

export function ProfileScreen() {
  const {
    identity,
    hasIdentity,
    setIdentityFromEmail,
    updateIdentity,
    clearCustomerContext,
  } = useCustomerIdentity();
  const [lookupEmail, setLookupEmail] = useState("");
  const [isEditingLookup, setIsEditingLookup] = useState(false);
  const [activeEditSection, setActiveEditSection] =
    useState<EditableContactSection | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContactForm);
  const [birthDateDraft, setBirthDateDraft] = useState<string | null>(null);
  const autoLoadedKeyRef = useRef("");

  const identityEmail = normalizeCustomerEmail(identity.email);
  const hasProfile = Boolean(data?.contact);
  const activeCardCode = data?.contact?.CodiceCard?.trim() || "";
  const activeCardName = data?.contact?.NomeCardAssegnata?.trim() || "";
  const hasActiveCard = Boolean(activeCardCode);
  const points = data?.points ?? data?.contact?.SaldoPuntiCard ?? 0;
  const visits = data?.contact?.NumeroVisite ?? 0;
  const upcomingReservations = data?.upcomingReservations ?? [];
  const rewardProgress = getFidelityRewardProgress(points);
  const isVip = rewardProgress.isVip;
  const hasMarketingConsent =
    data?.contact?.ConsensoMarketing === 1 || identity.marketingConsent === true;
  const contactSnapshot = buildContactForm(data?.contact);
  const displayedContact = activeEditSection ? contactForm : contactSnapshot;
  const hasStoredBirthDate = Boolean(contactSnapshot.birthDate);
  const summaryBirthDate = activeEditSection
    ? displayedContact.birthDate
    : birthDateDraft ?? contactSnapshot.birthDate;
  const shouldPromptBirthDate = !summaryBirthDate;
  const shouldShowMarketingPrompt =
    !activeEditSection && shouldPromptBirthDate && !hasMarketingConsent;
  const isEditingIdentity = activeEditSection === "identity";
  const isEditingContacts = activeEditSection === "contacts";
  const isEditingBirthDate = activeEditSection === "birthDate";
  const shouldShowBirthDateEditor = isEditingBirthDate || !hasStoredBirthDate;

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
            : "Non sono riuscito a recuperare il profilo.",
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
          : "Non sono riuscito a recuperare il profilo.",
      );
      autoLoadedKeyRef.current = "";
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async (
    overrides?: Partial<ContactFormState>,
    options?: { closeEditor?: boolean; successMessage?: string },
  ) => {
    const nextForm = {
      ...(activeEditSection ? contactForm : contactSnapshot),
      ...overrides,
    };
    const normalizedEmail = normalizeCustomerEmail(nextForm.email);

    if (!nextForm.firstName.trim() || !nextForm.lastName.trim()) {
      setContactError("Inserisci nome e cognome.");
      return false;
    }

    if (!normalizedEmail || !isValidCustomerEmail(normalizedEmail)) {
      setContactError("Inserisci un indirizzo email valido.");
      return false;
    }

    if (!nextForm.phone.trim()) {
      setContactError("Inserisci un numero di telefono valido.");
      return false;
    }

    setSavingContact(true);
    setContactError("");
    setContactMessage("");

    const shouldEnableMarketing =
      hasMarketingConsent || nextForm.marketingConsent || Boolean(nextForm.birthDate);

    try {
      const response = await requestJson<ProfileResponse>("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          firstName: nextForm.firstName.trim(),
          lastName: nextForm.lastName.trim(),
          phone: nextForm.phone.trim(),
          email: normalizedEmail,
          birthDate: nextForm.birthDate || undefined,
          marketingConsent: shouldEnableMarketing,
        }),
      });

      applyProfileResponse(response);
      setContactForm({
        ...nextForm,
        email: normalizedEmail,
        marketingConsent: shouldEnableMarketing,
      });
      setBirthDateDraft(null);
      if (options?.closeEditor ?? true) {
        setActiveEditSection(null);
      }
      setContactMessage(options?.successMessage || "Dati cliente aggiornati.");
      autoLoadedKeyRef.current = normalizedEmail;
      return true;
    } catch (saveError) {
      setContactError(
        saveError instanceof Error
          ? saveError.message
          : "Non sono riuscito a salvare i dati cliente.",
      );
      return false;
    } finally {
      setSavingContact(false);
    }
  };

  const changeAccount = () => {
    clearCustomerContext();
    setLookupEmail("");
    setData(null);
    setError("");
    setIsEditingLookup(true);
    setActiveEditSection(null);
    setContactForm(emptyContactForm);
    setBirthDateDraft(null);
    setContactError("");
    setContactMessage("");
    autoLoadedKeyRef.current = "";
  };

  const profileName =
    [data?.contact?.Nome, data?.contact?.Cognome].filter(Boolean).join(" ") ||
    "Cliente Tortuga";
  const activeCardSummary = activeCardName || "Card Tortuga";
  const showLookupPanel = isEditingLookup || !hasIdentity;
  const contactSummaryName =
    [displayedContact.firstName, displayedContact.lastName].filter(Boolean).join(" ") ||
    "Non disponibile";
  const openContactEditor = (section: EditableContactSection) => {
    setContactError("");
    setContactMessage("");
    setBirthDateDraft(null);
    setContactForm(contactSnapshot);
    setActiveEditSection(section);
  };

  return (
    <section className="space-y-5">
      {upcomingReservations.length > 0 ? (
        <div className="panel rounded-[2rem] p-5">
          <div className="space-y-2">
            <p className="eyebrow">Prossime Prenotazioni</p>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Le tue prossime serate gia&apos; in rotta verso il Tortuga.
            </p>
          </div>

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

                  <span className="rounded-full border border-[rgba(255,216,156,0.12)] bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                    {reservation.stateLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showLookupPanel ? (
        <div className="panel rounded-[2rem] p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="eyebrow">Riconoscimento Ciurma</p>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Inserisci la tua email e ritrova subito fidelity, punti e le
                serate che hai gia&apos; vissuto con Tortuga.
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
              onClick={() => void runLookup()}
              disabled={loading}
            >
              {loading ? "Recupero il profilo..." : "Entra nella tua area"}
            </button>
          </div>
        </div>
      ) : null}

      {loading && !hasProfile ? (
        <StatusBlock
          variant="loading"
          title="Sto recuperando il tuo profilo"
          description="Uso la tua email salvata per riportarti subito a bordo della tua area fidelity."
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
          title="Profilo non disponibile"
          description="L'email salvata non ha restituito un profilo valido. Puoi cambiare account e riprovare con un'altra email."
          action={
            <button
              type="button"
              className="button-secondary inline-flex min-h-11 items-center justify-center px-5"
              onClick={changeAccount}
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
          description="Cooperto non ha restituito un profilo per questa email. Controlla l'indirizzo inserito o prova con un altro account."
        />
      ) : null}

      {data?.contact ? (
        <>
          <div className="panel rounded-[2rem] p-5">
            <div className="space-y-2">
              <p className="eyebrow">Membro della Ciurma</p>
              <h2 className="text-2xl font-semibold text-white">{profileName}</h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Tieni aggiornati i tuoi riferimenti per prenotazioni, fidelity e serate speciali.
              </p>
            </div>

            {contactError ? (
              <div className="mt-4 rounded-[1.4rem] border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                {contactError}
              </div>
            ) : null}

            {contactMessage ? (
              <div className="mt-4 rounded-[1.4rem] border border-[rgba(242,215,165,0.14)] bg-[rgba(242,215,165,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]">
                {contactMessage}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Nome e cognome
                  </p>
                  <button
                    type="button"
                    className="text-[9px] font-medium uppercase tracking-[0.14em] text-[rgba(242,215,165,0.72)]"
                    onClick={() =>
                      isEditingIdentity
                        ? setActiveEditSection(null)
                        : openContactEditor("identity")
                    }
                  >
                    {isEditingIdentity ? "Chiudi" : "Modifica"}
                  </button>
                </div>

                {isEditingIdentity ? (
                  <div className="mt-3 space-y-3">
                    <input
                      className="field"
                      placeholder="Nome"
                      value={displayedContact.firstName}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="field"
                      placeholder="Cognome"
                      value={displayedContact.lastName}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
                      onClick={() => void saveContact()}
                      disabled={savingContact}
                    >
                      {savingContact ? "Salvo le modifiche..." : "Salva modifiche"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-base font-semibold text-white">
                    {contactSummaryName}
                  </p>
                )}
              </div>

              <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Contatti
                  </p>
                  <button
                    type="button"
                    className="text-[9px] font-medium uppercase tracking-[0.14em] text-[rgba(242,215,165,0.72)]"
                    onClick={() =>
                      isEditingContacts
                        ? setActiveEditSection(null)
                        : openContactEditor("contacts")
                    }
                  >
                    {isEditingContacts ? "Chiudi" : "Modifica"}
                  </button>
                </div>

                {isEditingContacts ? (
                  <div className="mt-3 space-y-3">
                    <input
                      className="field"
                      type="email"
                      placeholder="Email"
                      value={displayedContact.email}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="field"
                      type="tel"
                      placeholder="Telefono"
                      value={displayedContact.phone}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
                      onClick={() => void saveContact()}
                      disabled={savingContact}
                    >
                      {savingContact ? "Salvo le modifiche..." : "Salva modifiche"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--text-muted)]">
                    <p>
                      Email:{" "}
                      <span className="text-white">
                        {displayedContact.email || "Non disponibile"}
                      </span>
                    </p>
                    <p>
                      Telefono:{" "}
                      <span className="text-white">
                        {displayedContact.phone || "Non disponibile"}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Data di nascita
                  </p>
                  {hasStoredBirthDate ? (
                    <button
                      type="button"
                      className="text-[9px] font-medium uppercase tracking-[0.14em] text-[rgba(242,215,165,0.72)]"
                      onClick={() =>
                        isEditingBirthDate
                          ? setActiveEditSection(null)
                          : openContactEditor("birthDate")
                      }
                    >
                      {isEditingBirthDate ? "Chiudi" : "Modifica"}
                    </button>
                  ) : null}
                </div>

                {shouldShowBirthDateEditor ? (
                  <div className="mt-2 space-y-3">
                    <input
                      className="field"
                      type="date"
                      value={isEditingBirthDate ? displayedContact.birthDate : summaryBirthDate}
                      onChange={(event) => {
                        if (isEditingBirthDate) {
                          setContactForm((current) => ({
                            ...current,
                            birthDate: event.target.value,
                          }));
                        } else {
                          setBirthDateDraft(event.target.value);
                        }
                        setContactError("");
                        setContactMessage("");
                      }}
                    />

                    {!summaryBirthDate && !displayedContact.birthDate ? (
                      <p className="text-sm leading-6 text-[var(--text-muted)]">
                        Inserisci la tua data di nascita e ricevi un regalo nel tuo giorno speciale
                      </p>
                    ) : null}

                    {shouldShowMarketingPrompt ? (
                      <div className="space-y-3 rounded-[1.2rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                        <p className="text-sm leading-6 text-[var(--text-muted)]">
                          Vuoi ricevere promo, coupon e serate Tortuga?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="button-primary inline-flex min-h-11 items-center justify-center px-5"
                            onClick={() =>
                              void saveContact(
                                {
                                  birthDate:
                                    (isEditingBirthDate
                                      ? displayedContact.birthDate
                                      : summaryBirthDate) || undefined,
                                  marketingConsent: true,
                                },
                                {
                                  closeEditor: false,
                                  successMessage: "Consenso marketing aggiornato.",
                                },
                              )
                            }
                            disabled={savingContact}
                          >
                            Si
                          </button>
                          <button
                            type="button"
                            className="button-secondary inline-flex min-h-11 items-center justify-center px-5"
                            onClick={() => undefined}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
                      onClick={() =>
                        void saveContact(
                          {
                            birthDate:
                              (isEditingBirthDate
                                ? displayedContact.birthDate
                                : summaryBirthDate) || undefined,
                          },
                          { closeEditor: false },
                        )
                      }
                      disabled={savingContact}
                    >
                      {savingContact ? "Salvo le modifiche..." : "Salva modifiche"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-base font-semibold text-white">
                    {formatBirthDateLabel(contactSnapshot.birthDate)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="button-secondary inline-flex min-h-11 items-center justify-center px-4 text-sm"
                onClick={changeAccount}
              >
                Cambia profilo
              </button>
            </div>
          </div>

          <div
            className={cn(
              "panel rounded-[2rem] p-5",
              isVip &&
                "border-[rgba(242,215,165,0.38)] bg-[linear-gradient(160deg,rgba(242,215,165,0.18),rgba(13,9,6,0.98)_34%,rgba(58,39,19,0.84)_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.42)]",
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className={cn("eyebrow", isVip && "text-[#f5deb0]")}>
                  Fidelity Attiva
                </p>
                {isVip ? (
                  <span className="rounded-full border border-[rgba(242,215,165,0.32)] bg-[rgba(242,215,165,0.16)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#f5deb0]">
                    VIP
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "text-sm leading-6 text-[var(--text-muted)]",
                  isVip && "text-[rgba(245,222,176,0.82)]",
                )}
              >
                La tua card pronta da mostrare, ogni volta che torni a bordo.
              </p>
            </div>

            {hasActiveCard ? (
              <div className="mt-5 space-y-4 text-center">
                <FidelityQrCode
                  key={activeCardCode}
                  value={activeCardCode}
                  label={`QR fidelity di ${profileName}`}
                  variant={isVip ? "vip" : "default"}
                />
                <div className="space-y-1">
                  <p
                    className={cn(
                      "text-xl font-semibold text-white",
                      isVip && "text-[#fff0d0]",
                    )}
                  >
                    {activeCardSummary}
                  </p>
                  <p
                    className={cn(
                      "text-sm leading-6 text-[var(--text-muted)]",
                      isVip && "text-[rgba(245,222,176,0.82)]",
                    )}
                  >
                    Tienilo a portata di mano quando vuoi farti riconoscere al
                    Tortuga.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "mt-5 rounded-[1.7rem] border border-[var(--border)] bg-white/4 px-5 py-6 text-center",
                  isVip &&
                    "border-[rgba(242,215,165,0.24)] bg-[linear-gradient(180deg,rgba(242,215,165,0.08),rgba(255,255,255,0.02))]",
                )}
              >
                <div
                  className={cn(
                    "mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-white/6 text-lg font-semibold text-[var(--accent-strong)]",
                    isVip &&
                      "border-[rgba(242,215,165,0.3)] bg-[rgba(242,215,165,0.12)] text-[#f5deb0]",
                  )}
                >
                  TB
                </div>
                <h3
                  className={cn(
                    "mt-4 text-lg font-semibold text-white",
                    isVip && "text-[#fff0d0]",
                  )}
                >
                  Fidelity non disponibile
                </h3>
                <p
                  className={cn(
                    "mt-2 text-sm leading-6 text-[var(--text-muted)]",
                    isVip && "text-[rgba(245,222,176,0.82)]",
                  )}
                >
                  Per questa email non risulta una card attiva pronta da
                  mostrare in area cliente.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div
              className={cn(
                "panel rounded-[2rem] px-5 py-6",
                isVip &&
                  "border-[rgba(242,215,165,0.38)] bg-[linear-gradient(160deg,rgba(242,215,165,0.18),rgba(13,9,6,0.98)_34%,rgba(58,39,19,0.84)_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.42)]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={cn("eyebrow", isVip && "text-[#f5deb0]")}>
                  Punti della Ciurma
                </p>
                {isVip ? (
                  <span className="rounded-full border border-[rgba(242,215,165,0.32)] bg-[rgba(242,215,165,0.16)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#f5deb0]">
                    VIP
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-end justify-between gap-4">
                <p
                  className={cn(
                    "text-4xl font-semibold text-white",
                    isVip && "text-[#fff0d0]",
                  )}
                >
                  {rewardProgress.points}
                </p>
                {rewardProgress.nextReward ? (
                  <div className="rounded-full border border-[rgba(255,216,156,0.12)] bg-white/6 px-3 py-1 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                      Prossimo premio
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium text-white",
                        isVip && "text-[#fff0d0]",
                      )}
                    >
                      {rewardProgress.nextReward.label}
                    </p>
                  </div>
                ) : null}
              </div>

              <p
                className={cn(
                  "mt-2 text-sm leading-6 text-[var(--text-muted)]",
                  isVip && "text-[rgba(245,222,176,0.82)]",
                )}
              >
                {rewardProgress.isMaxTierReached
                  ? "Hai gia raggiunto il premio finale della rotta Tortuga."
                  : "Il saldo aggiornato della tua rotta loyalty."}
              </p>

              <div className="mt-5 space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
                  <div
                    className={cn(
                      "h-full rounded-full bg-[linear-gradient(90deg,#f7e0b2_0%,#d5a65b_50%,#8d6330_100%)] shadow-[0_0_18px_rgba(213,166,91,0.3)] transition-[width] duration-500",
                      rewardProgress.isMaxTierReached &&
                        "bg-[linear-gradient(90deg,#f9e8c5_0%,#f2c978_42%,#b57b2f_100%)]",
                    )}
                    style={{ width: `${rewardProgress.progressPercent}%` }}
                  />
                </div>

                <p
                  className={cn(
                    "text-sm leading-6 text-[var(--text-muted)]",
                    isVip && "text-[rgba(245,222,176,0.82)]",
                  )}
                >
                  {rewardProgress.isMaxTierReached
                    ? "Hai gia conquistato il premio piu esclusivo della ciurma."
                    : "Ti mancano pochi punti al prossimo premio"}
                </p>
              </div>
            </div>

            <div className="panel rounded-[2rem] px-5 py-6">
              <p className="eyebrow">Serate Gia&apos; Vissute</p>
              <p className="mt-3 text-4xl font-semibold text-white">{visits}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Le volte in cui sei gia&apos; passato dal Tortuga.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
