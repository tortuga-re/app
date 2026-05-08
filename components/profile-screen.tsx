/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { StatusBlock } from "@/components/status-block";
import dynamic from "next/dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FidelityActivationPanel = dynamic<any>(() => import("@/components/fidelity-activation-panel").then(mod => mod.FidelityActivationPanel).catch(() => { if (typeof window !== 'undefined') window.location.reload(); return { default: () => null } as any; }), { ssr: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CaptainChallengeTeaser = dynamic<any>(() => import("@/features/game/components/CaptainChallengeTeaser").then(mod => mod.CaptainChallengeTeaser).catch(() => { if (typeof window !== 'undefined') window.location.reload(); return { default: () => null } as any; }), { ssr: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PiratePhotoContestCard = dynamic<any>(() => import("@/features/pirate-photo/components/PiratePhotoContestCard").then(mod => mod.PiratePhotoContestCard).catch(() => { if (typeof window !== 'undefined') window.location.reload(); return { default: () => null } as any; }), { ssr: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LocalPirateAvatar = dynamic<any>(() => import("@/features/pirate-photo/components/LocalPirateAvatar").then(mod => mod.LocalPirateAvatar).catch(() => { if (typeof window !== 'undefined') window.location.reload(); return { default: () => null } as any; }), { ssr: false });
import { trackAppEvent } from "@/lib/analytics";
import { requestJson } from "@/lib/client";
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
import { getFidelityRewardProgress } from "@/lib/fidelity-rewards";
import type { EmailChangeRequestResponse } from "@/lib/profile-email-change/types";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { isAdmin } from "@/lib/live-buzzer/admin";
import { PwaPushCard } from "@/components/pwa-push-card";
import { useVisitRegistration } from "@/lib/hooks/use-visit-registration";
import { missions } from "@/lib/missions";

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
  const [isDataExpanded, setIsDataExpanded] = useState(false);
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
  const [showActivatedCardPanel, setShowActivatedCardPanel] = useState(false);
  const [activeGames, setActiveGames] = useState({ buzzer: false, matchDrink: false });
  const [selectedMission, setSelectedMission] = useState<import("@/lib/missions").Mission | null>(null);
  const autoLoadedKeyRef = useRef("");

  const identityEmail = normalizeCustomerEmail(identity.email);
  const { registerVisit } = useVisitRegistration();
  const hasProfile = Boolean(data?.contact);
  const profileName =
    [data?.contact?.Nome, data?.contact?.Cognome].filter(Boolean).join(" ") ||
    "Cliente Tortuga";
  const loyaltyProgress = getFidelityRewardProgress(
    data?.points ?? data?.contact?.SaldoPuntiCard ?? 0,
  );
  const activeCardCode = data?.contact?.CodiceCard?.trim() ?? "";
  const contactCode = data?.contact?.CodiceContatto?.trim() ?? "";
  const showLookupPanel = (isEditingLookup || !hasIdentity) && !isRegistering;
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
    `${loading}:${showLookupPanel}:${isRegistering}:${hasProfile}:${hasOnPremiseAccess}:${isEditingProfile}:${Boolean(contactMessage)}`,
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
    const fetchActiveGames = async () => {
      try {
        const games = await requestJson<{ buzzer: boolean; matchDrink: boolean }>("/api/game/active-status", { cache: "no-store" });
        setActiveGames(games);
      } catch (err) {
        console.error("Failed to fetch active games status", err);
      }
    };
    void fetchActiveGames();
    const intervalId = window.setInterval(fetchActiveGames, 5000); // Poll every 5 seconds
    return () => window.clearInterval(intervalId);
  }, []);

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

  const applyProfileResponse = async (response: ProfileResponse) => {
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

    // Sincronizza l'avatar persistente nel LocalStorage locale
    if (response.avatarUrl) {
      const { writeLocalStorageValue } = await import("@/lib/local-storage-state");
      const email = response.contact?.Email || response.query;
      const storageKey = `tortuga.customer-avatar:${email.trim().toLowerCase()}`;
      writeLocalStorageValue(storageKey, response.avatarUrl, (v) => v);
    }
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
    setShowActivatedCardPanel(false);

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
         
        window.location.hash = "#riconoscimento";
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
      // eslint-disable-next-line react-hooks/immutability
      window.location.hash = "#riconoscimento";
    } catch (saveError) {
      setContactError(
        saveError instanceof Error
          ? saveError.message
          : "Non sono riuscito a salvare i dati cliente.",
      );
      // eslint-disable-next-line react-hooks/immutability
      window.location.hash = "#riconoscimento";
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
       
      window.location.hash = "#riconoscimento";
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
    setShowActivatedCardPanel(false);
    setContactForm({
      ...emptyContactForm,
      email: normalizedEmail,
    });
    setIsRegistering(true);
     
    window.location.hash = "#riconoscimento";
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
    setShowActivatedCardPanel(false);
    autoLoadedKeyRef.current = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleFidelityActivated = (profile: ProfileResponse) => {
    applyProfileResponse(profile);
    setShowActivatedCardPanel(true);
    setContactForm(buildContactForm(profile.contact ?? undefined));
    autoLoadedKeyRef.current =
      normalizeCustomerEmail(profile.contact?.Email) || profile.query;
     
    window.location.hash = "#riconoscimento";
  };

  return (
    <section className="space-y-5 parchment-unroll-animation">

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
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm font-semibold text-[var(--accent-strong)]">
                    +39
                  </span>
                  <input
                    className="field pl-14"
                    type="tel"
                    value={contactForm.phone.replace(/^\+39/, "")}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        phone: "+39" + event.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
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
        <div id="contest" className="hash-scroll-target rounded-[2rem]">
          <PiratePhotoContestCard
            contact={data?.contact ?? null}
            onProfileResolved={applyProfileResponse}
            onVisitTrigger={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
          />
        </div>
      ) : null}

      {data?.contact ? (
        <>
          <div className="mb-5">
            <PwaPushCard />
          </div>
          <div id="scatto-del-mese" className="hash-scroll-target rounded-[2rem]">
            <PiratePhotoContestCard
              key={data.contact.CodiceContatto || contactSnapshot.email || identityEmail}
              contact={data.contact}
              onProfileResolved={handlePiratePhotoProfileResolved}
              onVisitTrigger={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
            />
          </div>

          <div id="sfide" className="panel hash-scroll-target rounded-[2rem] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="eyebrow">Sfide e contenuti</p>
              </div>

              <span className="rounded-full border border-[rgba(171,128,63,0.18)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Esclusive
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {/* Client-facing cards (Hidden for Admins) */}
              {!isAdmin(identity.email) && (
                <>
                  {/* Match & Drink - GIOVEDÌ */}
                  {activeGames.matchDrink && (
                    <Link
                      href="/game/match-drink"
                      onClick={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
                      className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-[#D8B06A] bg-[rgba(216,176,106,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-white uppercase italic">🍸 Match & Drink - GIOVEDÌ</p>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                            Nuove amicizie o anima gemella? Incontra persone che condividono i tuoi stessi interessi!
                          </p>
                        </div>
                        <span className="rounded-full border border-[#D8B06A] bg-[#D8B06A]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D8B06A]">
                          GIOCA ORA
                        </span>
                      </div>
                    </Link>
                  )}

                  {/* Buzzer Card - Client */}
                  {activeGames.buzzer && (
                    <a
                      href="/game/buzzer"
                      onClick={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
                      className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-[var(--accent-strong)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-white uppercase italic">🏴‍☠️ Assalto al Buzzer</p>
                          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                            La &quot;Sarabanda&quot; del Tortuga! Sei più Uomo Gatto o Tiramisù? Indovina il brano e prenota la risposta per primo!
                          </p>
                        </div>
                        <span className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                          GIOCA ORA
                        </span>
                      </div>
                    </a>
                  )}
                  {hasOnPremiseAccess && (
                    <>
                      <CaptainChallengeTeaser
                        className="mt-4"
                        onClick={() => data?.contact?.CodiceContatto && void registerVisit(data.contact.CodiceContatto)}
                      />
                    </>
                  )}

                  {/* Receipt Upload Card - Client */}
                  <Link
                    href="/ciurma/carica-scontrino"
                    className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-[var(--accent-strong)] bg-[var(--accent-soft)]/5 mt-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-white uppercase italic">💰 Carica Scontrino</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                          Hai cenato al Tortuga? Carica la foto dello scontrino per accumulare punti sulla tua card!
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--accent-strong)] bg-[var(--accent-strong)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                        CARICA
                      </span>
                    </div>
                  </Link>
                </>
              )}

              {/* Buzzer Card - Admin (Captain only) */}
              {isAdmin(identity.email) && (
                <a
                  href="/admin/buzzer"
                  className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-purple-500 bg-purple-500/5"
                  onClick={() => {
                    triggerHaptic();
                    if (data?.contact?.CodiceContatto) {
                      void registerVisit(data.contact.CodiceContatto);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white uppercase italic">⚓ Plancia Assalto al Buzzer</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Gestisci le prenotazioni e assegna il bottino.
                      </p>
                    </div>
                    <span className="rounded-full border border-blue-500 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
                      ADMIN
                    </span>
                  </div>
                </a>
              )}

              {/* Match & Drink Admin */}
              {isAdmin(identity.email) && (
                <Link
                  href="/admin/match-drink"
                  className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-blue-500 bg-blue-500/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white uppercase italic">🍸 Plancia Match & Drink</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Avvia sessioni, gestisci domande e sblocca i drink del match.
                      </p>
                    </div>
                    <span className="rounded-full border border-blue-500 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
                      ADMIN
                    </span>
                  </div>
                </Link>
              )}
              {/* Kantaquiz Admin */}
              {isAdmin(identity.email) && (
                <button
                  onClick={async () => {
                    const pin = prompt("Inserisci PIN Capitano:");
                    if (!pin) return;
                    try {
                      const res = await fetch("/api/game/kantaquiz", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pin }),
                      });
                      if (res.ok) {
                        alert("Kantaquiz avviato! La guida Dr. Why sarà visibile per 3 ore.");
                      } else {
                        const errData = await res.json();
                        alert("Errore: " + errData.error);
                      }
                    } catch {
                      alert("Errore di connessione.");
                    }
                  }}
                  className="panel-muted rounded-[1.5rem] px-4 py-4 block w-full text-left transition-all hover:scale-[1.02] active:scale-95 border-orange-500 bg-orange-500/5 mt-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white uppercase italic">🎤 Avvia Kantaquiz</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Attiva la guida Dr. Why nella tab Info per i clienti.
                      </p>
                    </div>
                    <span className="rounded-full border border-orange-500 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">
                      ADMIN
                    </span>
                  </div>
                </button>
              )}

              {/* Push Admin */}
              {isAdmin(identity.email) && (
                <Link
                  href="/admin/push"
                  className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-purple-500 bg-purple-500/5 mt-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white uppercase italic">📣 Plancia Push</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Invia notifiche personalizzate a tutta la ciurma o solo ai presenti.
                      </p>
                    </div>
                    <span className="rounded-full border border-purple-500 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-400">
                      ADMIN
                    </span>
                  </div>
                </Link>
              )}

              {/* Receipts Admin */}
              {isAdmin(identity.email) && (
                <Link
                  href="/admin/scontrini"
                  className="panel-muted rounded-[1.5rem] px-4 py-4 block transition-all hover:scale-[1.02] active:scale-95 border-emerald-500 bg-emerald-500/5 mt-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white uppercase italic">💰 Gestione Scontrini</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Valida gli scontrini inviati dai pirati e assegna i punti.
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
                      ADMIN
                    </span>
                  </div>
                </Link>
              )}

            </div>
          </div>

          <div
            id="riconoscimento"
            className="panel hash-scroll-target rounded-[2rem] p-5 overflow-visible"
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--accent-strong)]">
                Passaporto del pirata
              </p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)] animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Documento Valido</span>
              </div>
            </div>

            <div className="relative z-20 flex min-w-0 items-center gap-4">
              <LocalPirateAvatar
                customerKey={
                  contactSnapshot.email ||
                  identityEmail ||
                  data.contact.CodiceContatto ||
                  profileName
                }
                label={profileName}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="truncate text-2xl font-semibold text-white">
                  {profileName}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(216,176,106,0.18)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                    {loyaltyProgress.loyaltyTier.label}
                  </span>
                  <span className="text-xs leading-5 text-[var(--text-muted)]">
                    {loyaltyProgress.points} punti
                  </span>
                </div>
              </div>
            </div>

            {/* Missioni (Badges) - Passaporto del Pirata */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Le tue Imprese
                </p>
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {missions.filter(m => m.isUnlocked(data)).length} / {missions.length} Sbloccate
                </span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden mask-fade-right">
                {missions.map((mission) => {
                  const isUnlocked = mission.isUnlocked(data);
                  return (
                    <button 
                      key={mission.id} 
                      onClick={() => {
                        triggerHaptic();
                        setSelectedMission(mission);
                      }}
                      className="group relative flex flex-col items-center gap-2 flex-shrink-0 outline-none"
                    >
                      <div 
                        className={cn(
                          "flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-500 overflow-hidden",
                          isUnlocked 
                            ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] shadow-[0_0_15px_rgba(216,176,106,0.3)]" 
                            : "border-white/5 bg-white/5 grayscale opacity-30"
                        )}
                      >
                        {mission.image ? (
                          <img 
                            src={mission.image} 
                            alt={mission.label} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">{mission.icon}</span>
                        )}
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold text-center uppercase tracking-tight leading-tight w-20 break-words",
                        isUnlocked ? "text-white" : "text-[var(--text-muted)]"
                      )}>
                        {mission.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="my-8 border-t border-white/5" />

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

            <div className="mt-4 space-y-3">
              {/* Core Header (Always visible) */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                    Dati Anagrafici
                  </p>
                  <h3 className="text-lg font-bold text-white">
                    {contactSnapshot.firstName} {contactSnapshot.lastName}
                  </h3>
                </div>
                {!isEditingProfile && (
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(216,176,106,0.25)] bg-[rgba(216,176,106,0.1)] text-[var(--accent-strong)] transition-all active:scale-90"
                    onClick={() => {
                      triggerHaptic();
                      setIsDataExpanded(!isDataExpanded);
                    }}
                  >
                    <span className="text-xl font-bold leading-none">
                      {isDataExpanded ? "−" : "+"}
                    </span>
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <div className="grid gap-4">
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
                            email: normalizeCustomerEmail(event.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[var(--text-muted)]">
                      <span>Telefono</span>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                          +39
                        </span>
                        <input
                          className="field pl-14"
                          type="tel"
                          value={contactForm.phone.replace(/^\+39/, "")}
                          onChange={(event) =>
                            setContactForm((current) => ({
                              ...current,
                              phone: "+39" + event.target.value.replace(/\D/g, ""),
                            }))
                          }
                        />
                      </div>
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
                <div className="grid gap-3">
                  {/* Collapsible/Missing Content */}
                  <div className="grid gap-3">
                    {/* Contacts (Email/Phone) - Expanded only if full, or if one is missing */}
                    {(isDataExpanded || !contactSnapshot.email || !contactSnapshot.phone) && (
                      <div className="panel-muted rounded-[1.5rem] px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                          Contatti
                        </p>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--text-muted)]">
                          <p>
                            Email:{" "}
                            <span className={contactSnapshot.email ? "text-white" : "text-[var(--danger)] font-semibold"}>
                              {contactSnapshot.email || "Non disponibile"}
                            </span>
                          </p>
                          <p>
                            Telefono:{" "}
                            <span className={contactSnapshot.phone ? "text-white" : "text-[var(--danger)] font-semibold"}>
                              {contactSnapshot.phone || "Non disponibile"}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Birth Date - Expanded only if full, or if missing */}
                    {(isDataExpanded || !contactSnapshot.birthDate) && (
                      <div className="panel-muted rounded-[1.5rem] px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                          Data di nascita
                        </p>
                        <p className={contactSnapshot.birthDate ? "mt-2 text-base font-semibold text-white" : "mt-2 text-sm text-[var(--danger)] font-semibold"}>
                          {contactSnapshot.birthDate
                            ? formatBirthDateLabel(contactSnapshot.birthDate)
                            : "Non disponibile"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!activeCardCode || showActivatedCardPanel ? (
                <div className="mt-2">
                  <FidelityActivationPanel
                    contactCode={contactCode}
                    activeCardCode={activeCardCode}
                    qrLabel="QR ciurma Tortuga"
                    onActivated={handleFidelityActivated}
                  />
                </div>
              ) : null}
            </div>


            <div className="mt-5 flex flex-col gap-2 border-t border-[rgba(216,176,106,0.14)] pt-4 sm:flex-row">
              <button
                type="button"
                className="button-secondary inline-flex min-h-11 flex-1 items-center justify-center px-4 text-sm"
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
                className="button-secondary inline-flex min-h-11 flex-1 items-center justify-center px-4 text-sm"
                onClick={() => {
                  triggerHaptic();
                  changeAccount();
                }}
              >
                Cambia profilo
              </button>
            </div>

          </div>
        </>
      ) : null}

      {/* Mission Info Modal */}
      {selectedMission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#121212] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-4 flex flex-col items-center gap-6">
              <div 
                className={cn(
                  "flex h-48 w-48 items-center justify-center rounded-full border shadow-2xl overflow-hidden",
                  selectedMission.isUnlocked(data!) 
                    ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] shadow-[0_0_30px_rgba(216,176,106,0.2)]" 
                    : "border-white/5 bg-white/5 grayscale opacity-30"
                )}
              >
                {selectedMission.image ? (
                  <img 
                    src={selectedMission.image} 
                    alt={selectedMission.label} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-8xl">{selectedMission.icon}</span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                  {selectedMission.isUnlocked(data!) ? "Missione Compiuta" : "Missione Segreta"}
                </p>
                <h3 className="text-2xl font-bold text-white uppercase italic">
                  {selectedMission.label}
                </h3>
              </div>

              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {selectedMission.description}
              </p>

              <button
                onClick={() => setSelectedMission(null)}
                className="button-primary mt-4 w-full rounded-2xl py-4 text-sm font-bold uppercase tracking-widest"
              >
                Chiudi
              </button>
            </div>
          </div>
          {/* Backdrop click to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedMission(null)} />
        </div>
      )}
    </section>
  );
}

export const ProfileScreen = CiurmaScreen;
