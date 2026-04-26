"use client";

import { useEffect, useRef, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { CaptainChallengeTeaser } from "@/features/game/components/CaptainChallengeTeaser";
import { LocalExperienceTeaser } from "@/features/local-experience/components/LocalExperienceTeaser";
import { LocalPirateAvatar } from "@/features/pirate-photo/components/LocalPirateAvatar";
import { PiratePhotoContestCard } from "@/features/pirate-photo/components/PiratePhotoContestCard";
import { trackAppEvent } from "@/lib/analytics";
import { requestJson } from "@/lib/client";
import { ciurmaRoadmapFeatures } from "@/lib/config";
import {
  formatBirthDateLabel,
  toDateInputValue,
} from "@/lib/customer-profile";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { useHashScroll } from "@/lib/hash-scroll";
import type { EmailChangeRequestResponse } from "@/lib/profile-email-change/types";
import { triggerHaptic } from "@/lib/haptics";
import { useOnPremiseAccess } from "@/lib/on-premise-access";

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
    updateIdentity,
    clearCustomerContext,
  } = useCustomerIdentity();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const [lookupEmail, setLookupEmail] = useState("");
  const [isEditingLookup, setIsEditingLookup] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContactForm);
  const [emailChangeRequest, setEmailChangeRequest] =
    useState<EmailChangeRequestResponse | null>(null);
  const [emailChangeCode, setEmailChangeCode] = useState("");
  const [emailChangeNow, setEmailChangeNow] = useState(() => Date.now());
  const [verifyingEmailChange, setVerifyingEmailChange] = useState(false);
  const [resendingEmailChange, setResendingEmailChange] = useState(false);
  const autoLoadedKeyRef = useRef("");

  const identityEmail = normalizeCustomerEmail(identity.email);
  const hasProfile = Boolean(data?.contact);
  const profileName =
    [data?.contact?.Nome, data?.contact?.Cognome].filter(Boolean).join(" ") ||
    "Cliente Tortuga";
  const showLookupPanel = isEditingLookup || !hasIdentity;
  const contactSnapshot = buildContactForm(data?.contact ?? undefined);
  const existingSavedEmail = hasProfile
    ? normalizeCustomerEmail(contactSnapshot.email || identityEmail)
    : "";
  const editedEmail = normalizeCustomerEmail(contactForm.email);
  const emailChangeNeedsVerification = Boolean(
    existingSavedEmail && editedEmail && existingSavedEmail !== editedEmail,
  );
  const emailChangeResendAt = emailChangeRequest
    ? Date.parse(emailChangeRequest.resendAvailableAt)
    : 0;
  const emailChangeCanResend = Boolean(
    emailChangeRequest && emailChangeNow >= emailChangeResendAt,
  );
  const emailChangeResendSeconds = Math.max(
    Math.ceil((emailChangeResendAt - emailChangeNow) / 1000),
    0,
  );
  const emailChangeExpiresAtLabel = emailChangeRequest
    ? new Intl.DateTimeFormat("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(emailChangeRequest.expiresAt))
    : "";
  useHashScroll(
    `${loading}:${showLookupPanel}:${isRegistering}:${hasProfile}:${hasOnPremiseAccess}`,
  );

  useEffect(() => {
    if (!emailChangeRequest) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setEmailChangeNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [emailChangeRequest]);

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
    setLoading(true);
    setError("");
    setIsRegistering(false);
    setEmailChangeRequest(null);
    setEmailChangeCode("");

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
        trackAppEvent("login_success", {
          app_section: "ciurma",
          login_method: "email_lookup",
          profile_source: response.source,
          has_contact_code: Boolean(response.contact.CodiceContatto),
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
      const profilePayload = {
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        phone: contactForm.phone.trim(),
        email: normalizedEmail,
        birthDate: contactForm.birthDate || undefined,
        marketingConsent: contactForm.marketingConsent,
      };

      if (existingSavedEmail && existingSavedEmail !== normalizedEmail) {
        const response = await requestJson<EmailChangeRequestResponse>(
          "/api/profile/email-change/request",
          {
            method: "POST",
            body: JSON.stringify({
              currentEmail: existingSavedEmail,
              profile: profilePayload,
            }),
          },
        );

        setEmailChangeRequest(response);
        setEmailChangeCode("");
        setContactMessage(
          `Codice inviato a ${response.pendingEmail}. L'email attuale resta valida fino alla verifica.`,
        );
        return;
      }

      const response = await requestJson<ProfileResponse>("/api/profile", {
        method: "POST",
        body: JSON.stringify(profilePayload),
      });

      applyProfileResponse(response);
      if (response.contact) {
        trackAppEvent("login_success", {
          app_section: "ciurma",
          login_method: "profile_registration",
          profile_source: response.source,
          has_contact_code: Boolean(response.contact.CodiceContatto),
        });
      }
      setContactForm((current) => ({
        ...current,
        email: normalizedEmail,
      }));
      setIsEditingProfile(false);
      setIsRegistering(false);
      setIsEditingLookup(false);
      setEmailChangeRequest(null);
      setEmailChangeCode("");
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

  const verifyEmailChange = async () => {
    if (!emailChangeRequest) {
      return;
    }

    const code = emailChangeCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setContactError("Inserisci il codice a 6 cifre.");
      return;
    }

    setVerifyingEmailChange(true);
    setContactError("");
    setContactMessage("");

    try {
      const response = await requestJson<ProfileResponse>(
        "/api/profile/email-change/verify",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: emailChangeRequest.requestId,
            code,
          }),
        },
      );

      applyProfileResponse(response);
      if (response.contact) {
        trackAppEvent("login_success", {
          app_section: "ciurma",
          login_method: "email_change_verified",
          profile_source: response.source,
          has_contact_code: Boolean(response.contact.CodiceContatto),
        });
      }
      setContactForm(buildContactForm(response.contact ?? undefined));
      setIsEditingProfile(false);
      setIsRegistering(false);
      setIsEditingLookup(false);
      setEmailChangeRequest(null);
      setEmailChangeCode("");
      setContactMessage("Email verificata e profilo aggiornato.");
      autoLoadedKeyRef.current = normalizeCustomerEmail(
        response.contact?.Email || response.query,
      );
    } catch (verifyError) {
      setContactError(
        verifyError instanceof Error
          ? verifyError.message
          : "Non sono riuscito a verificare la nuova email.",
      );
    } finally {
      setVerifyingEmailChange(false);
    }
  };

  const resendEmailChangeCode = async () => {
    if (!emailChangeRequest) {
      return;
    }

    setResendingEmailChange(true);
    setContactError("");
    setContactMessage("");

    try {
      const response = await requestJson<EmailChangeRequestResponse>(
        "/api/profile/email-change/resend",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: emailChangeRequest.requestId,
          }),
        },
      );

      setEmailChangeRequest(response);
      setEmailChangeCode("");
      setContactMessage(`Nuovo codice inviato a ${response.pendingEmail}.`);
    } catch (resendError) {
      setContactError(
        resendError instanceof Error
          ? resendError.message
          : "Non sono riuscito a reinviare il codice.",
      );
    } finally {
      setResendingEmailChange(false);
    }
  };

  const openContactEditor = () => {
    setContactError("");
    setContactMessage("");
    setEmailChangeRequest(null);
    setEmailChangeCode("");
    setContactForm(contactSnapshot);
    setIsEditingProfile(true);
  };

  const startRegistration = () => {
    const normalizedEmail = normalizeCustomerEmail(lookupEmail || identityEmail);
    setError("");
    setContactError("");
    setContactMessage("");
    setEmailChangeRequest(null);
    setEmailChangeCode("");
    setContactForm({
      ...emptyContactForm,
      email: normalizedEmail,
    });
    setIsRegistering(true);
  };

  const changeAccount = () => {
    clearCustomerContext();
    setLookupEmail("");
    setData(null);
    setError("");
    setIsEditingLookup(true);
    setIsEditingProfile(false);
    setIsRegistering(false);
    setContactForm(emptyContactForm);
    setContactError("");
    setContactMessage("");
    setEmailChangeRequest(null);
    setEmailChangeCode("");
    autoLoadedKeyRef.current = "";
  };

  const handlePiratePhotoProfileResolved = (profile: ProfileResponse) => {
    applyProfileResponse(profile);
    setContactForm(buildContactForm(profile.contact ?? undefined));
    setIsEditingLookup(false);
    setIsRegistering(false);
    setIsEditingProfile(false);
    setContactError("");
    setContactMessage("");
    autoLoadedKeyRef.current = normalizeCustomerEmail(
      profile.contact?.Email || profile.query,
    );
  };

  return (
    <section className="space-y-5">
      {hasOnPremiseAccess ? (
        <>
          <div id="sfida-capitano" className="hash-scroll-target rounded-[2rem]">
            <CaptainChallengeTeaser />
          </div>
          <div id="esperienze-locale" className="hash-scroll-target rounded-[2rem]">
            <LocalExperienceTeaser />
          </div>
        </>
      ) : null}

      {showLookupPanel ? (
        <div id="riconoscimento" className="panel hash-scroll-target rounded-[2rem] p-5">
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
            <button
              type="button"
              className="button-secondary flex min-h-12 w-full items-center justify-center px-4"
              onClick={() => {
                triggerHaptic();
                startRegistration();
              }}
            >
              Registrati
            </button>
          </div>
        </div>
      ) : null}

      {isRegistering ? (
        <div id="registrazione" className="panel hash-scroll-target rounded-[2rem] p-5">
          <div className="space-y-2">
            <p className="eyebrow">Registrazione ciurma</p>
            <h2 className="text-xl font-semibold text-white">
              Crea il tuo profilo Tortuga.
            </h2>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Inserisci i dati principali: useremo la tua email per riconoscerti
              quando torni a bordo.
            </p>
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
              <span>Accetto comunicazioni marketing future di Tortuga.</span>
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
              {savingContact ? "Registro la ciurma..." : "Completa registrazione"}
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
          action={
            <button
              type="button"
              className="button-primary inline-flex min-h-11 items-center justify-center px-5"
              onClick={() => {
                triggerHaptic();
                startRegistration();
              }}
            >
              Registrati
            </button>
          }
        />
      ) : null}

      {!data?.contact ? (
        <div id="scatto-del-mese" className="hash-scroll-target rounded-[2rem]">
          <PiratePhotoContestCard
            key={identityEmail || "ospite"}
            contact={null}
            onProfileResolved={handlePiratePhotoProfileResolved}
          />
        </div>
      ) : null}

      {data?.contact ? (
        <>
          <div id="riconoscimento" className="panel hash-scroll-target rounded-[2rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <LocalPirateAvatar
                  customerKey={
                    contactSnapshot.email ||
                    identityEmail ||
                    data.contact.CodiceContatto ||
                    profileName
                  }
                  label={profileName}
                />
                <div className="min-w-0 space-y-2">
                  <p className="eyebrow">Membro della ciurma</p>
                  <h2 className="text-2xl font-semibold text-white">{profileName}</h2>
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    Qui tieni in ordine i dati che contano davvero quando torni a bordo.
                  </p>
                </div>
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
                      onChange={(event) => {
                        const nextEmail = event.target.value;

                        if (
                          emailChangeRequest &&
                          normalizeCustomerEmail(nextEmail) !==
                            emailChangeRequest.pendingEmail
                        ) {
                          setEmailChangeRequest(null);
                          setEmailChangeCode("");
                        }

                        setContactForm((current) => ({
                          ...current,
                          email: nextEmail,
                        }));
                      }}
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

                {emailChangeRequest ? (
                  <div className="panel-muted rounded-[1.5rem] px-4 py-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                        Verifica email
                      </p>
                      <h3 className="text-lg font-semibold text-white">
                        Controlla {emailChangeRequest.pendingEmail}
                      </h3>
                      <p className="text-sm leading-6 text-[var(--text-muted)]">
                        La tua email attuale resta valida finche non confermi il
                        codice. Il codice scade alle {emailChangeExpiresAtLabel}.
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <input
                        className="field text-center text-lg font-semibold tracking-[0.35em]"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        value={emailChangeCode}
                        onChange={(event) =>
                          setEmailChangeCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          className="button-primary inline-flex min-h-11 items-center justify-center px-4 text-sm"
                          onClick={() => {
                            triggerHaptic();
                            void verifyEmailChange();
                          }}
                          disabled={
                            verifyingEmailChange || emailChangeCode.trim().length !== 6
                          }
                        >
                          {verifyingEmailChange
                            ? "Verifico..."
                            : "Conferma codice"}
                        </button>
                        <button
                          type="button"
                          className="button-secondary inline-flex min-h-11 items-center justify-center px-4 text-sm"
                          onClick={() => {
                            triggerHaptic();
                            void resendEmailChangeCode();
                          }}
                          disabled={
                            resendingEmailChange || !emailChangeCanResend
                          }
                        >
                          {resendingEmailChange
                            ? "Invio..."
                            : emailChangeCanResend
                              ? "Reinvia codice"
                              : `Reinvia tra ${emailChangeResendSeconds}s`}
                        </button>
                      </div>

                      <p className="text-xs leading-5 text-[var(--text-muted)]">
                        Tentativi rimasti: {emailChangeRequest.attemptsRemaining}.
                      </p>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
                  onClick={() => {
                    triggerHaptic();
                    void saveContact();
                  }}
                  disabled={savingContact || verifyingEmailChange}
                >
                  {savingContact
                    ? "Salvo le modifiche..."
                    : emailChangeNeedsVerification
                      ? "Invia codice verifica"
                      : "Salva modifiche"}
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

          <div id="scatto-del-mese" className="hash-scroll-target rounded-[2rem]">
            <PiratePhotoContestCard
              key={data.contact.CodiceContatto || contactSnapshot.email || identityEmail}
              contact={data.contact}
              onProfileResolved={handlePiratePhotoProfileResolved}
            />
          </div>

          <div id="sfide" className="panel hash-scroll-target rounded-[2rem] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="eyebrow">Sfide e contenuti</p>
                <h2 className="text-2xl font-semibold text-white">
                  Sfide, inviti e contenuti speciali pensati per chi fa parte della ciurma.
                </h2>
              </div>

              <span className="rounded-full border border-[rgba(171,128,63,0.18)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Esclusive
              </span>
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
