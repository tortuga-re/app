/* eslint-disable @next/next/no-img-element */
"use client";
import { missions } from "@/lib/missions";

import { useEffect, useRef, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { trackAppEvent } from "@/lib/analytics";
import { requestJson } from "@/lib/client";
import { scrollToFormField } from "@/lib/form-focus";
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
import { cn, formatTime } from "@/lib/utils";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { isAdmin } from "@/lib/admin/identity";
import { useVisitRegistration } from "@/lib/hooks/use-visit-registration";
import {
  italianPhoneValidationError,
  normalizeItalianPhone,
  validateItalianPhone,
} from "@/lib/validation/phone";
import { ProfileLogin } from "@/features/profile/components/ProfileLogin";
import { ProfileEditor } from "@/features/profile/components/ProfileEditor";
import { ProfileDashboard } from "@/features/profile/components/ProfileDashboard";
import { ProfileGamesAndAdmin } from "@/features/profile/components/ProfileGamesAndAdmin";
import { ProfilePassport } from "@/features/profile/components/ProfilePassport";
import { OfflinePassportScreen } from "@/features/profile/components/OfflinePassportScreen";
import { saveOfflinePassport } from "@/lib/offline-passport";
import { buildContactForm, emptyContactForm, loadProfileData, type ContactFormState, type ProfileFieldName } from "@/features/profile/utils";

export function CiurmaScreen() {
  const {
    identity,
    hasIdentity,
    updateIdentity,
    clearCustomerContext,
  } = useCustomerIdentity();
  const { scenario } = useDemoScenario();
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
  const [isOnline, setIsOnline] = useState(true);
  const [selectedMission, setSelectedMission] = useState<import("@/lib/missions").Mission | null>(null);
  const [loginMode, setLoginMode] = useState<"lookup" | "confirm" | "otp">("lookup");
  const [loginRequest, setLoginRequest] = useState<{
    requestId: string;
    email: string;
    expiresAt: string;
    resendAvailableAt: string;
    attemptsRemaining: number;
  } | null>(null);
  const [loginCode, setLoginCode] = useState("");
  const [verifyingLogin, setVerifyingLogin] = useState(false);
  const [resendingLogin, setResendingLogin] = useState(false);
  const [loginFieldErrors, setLoginFieldErrors] = useState<
    Partial<Record<"lookupEmail" | "loginCode", string>>
  >({});
  const [contactFieldErrors, setContactFieldErrors] = useState<
    Partial<Record<"firstName" | "lastName" | "email" | "phone", string>>
  >({});
  const longPressRef = useRef<number | null>(null);
  const autoLoadedKeyRef = useRef("");
  const fieldRefs = useRef<Partial<Record<ProfileFieldName, HTMLElement | null>>>({});
  const setFieldRef = (field: ProfileFieldName) => (element: HTMLElement | null) => {
    fieldRefs.current[field] = element;
  };
  const clearLoginFieldErrors = (...fields: Array<"lookupEmail" | "loginCode">) => {
    setLoginFieldErrors((current) => {
      let hasChanged = false;
      const next = { ...current };

      for (const field of fields) {
        if (next[field]) {
          delete next[field];
          hasChanged = true;
        }
      }

      return hasChanged ? next : current;
    });
  };
  const clearContactFieldErrors = (
    ...fields: Array<"firstName" | "lastName" | "email" | "phone">
  ) => {
    setContactFieldErrors((current) => {
      let hasChanged = false;
      const next = { ...current };

      for (const field of fields) {
        if (next[field]) {
          delete next[field];
          hasChanged = true;
        }
      }

      return hasChanged ? next : current;
    });
  };
  const scrollToFirstProfileField = (fields: ProfileFieldName[]) => {
    for (const field of fields) {
      const element = fieldRefs.current[field];
      if (element) {
        scrollToFormField(element);
        return;
      }
    }
  };
  const handlePhoneBlur = () => {
    if (!contactForm.phone.trim()) return;
    const normalized = normalizeItalianPhone(contactForm.phone);
    if (normalized) {
      setContactForm((current) => ({
        ...current,
        phone: normalized.nationalNumber,
      }));
    }
  };

  const identityEmail = normalizeCustomerEmail(identity.email);
  const isLoggedAdmin = isAdmin(identity.email) || (scenario.enabled && scenario.demoAdmin);
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
  const didProfileStartWithPhone = Boolean(contactSnapshot.phone.trim());
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
    ? formatTime(emailChangeRequest.expiresAt)
    : "";
    
  const loginResendAt = loginRequest ? Date.parse(loginRequest.resendAvailableAt) : 0;
  const loginCanResend = Boolean(loginRequest && emailChangeNow >= loginResendAt);
  const loginResendSeconds = Math.max(Math.ceil((loginResendAt - emailChangeNow) / 1000), 0);
  const loginExpiresAtLabel = loginRequest
    ? formatTime(loginRequest.expiresAt)
    : "";

  useHashScroll(
    `${loading}:${showLookupPanel}:${isRegistering}:${hasProfile}:${hasOnPremiseAccess}:${isEditingProfile}:${Boolean(contactMessage)}:${loginMode}`,
  );

  useEffect(() => {
    if (!emailChangeRequest && !loginRequest) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setEmailChangeNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [emailChangeRequest, loginRequest]);

  // ─── Rilevamento connessione di rete ─────────────────────────────────────
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
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
  }, [identityEmail, isEditingLookup, hasProfile, updateIdentity]);

  useEffect(() => {
    if (!data?.contact) {
      return;
    }

    trackAppEvent("profile_loot_view", {
      app_section: "ciurma",
      visits_count: data.contact.NumeroVisite ?? 0,
      coupons_active: data.coupons.filter((coupon) => !coupon.Utilizzato).length,
      missions_unlocked: missions.filter((mission) => mission.isUnlocked(data)).length,
      loyalty_points: loyaltyProgress.points,
    });


    // ─── Salva passaporto offline ────────────────────────────────────────────
    const offlineName = [data.contact.Nome, data.contact.Cognome].filter(Boolean).join(" ") || "Cliente Tortuga";
    saveOfflinePassport({
      profileName: offlineName,
      email: data.contact.Email ?? identityEmail,
      contactCode: data.contact.CodiceContatto?.trim() ?? "",
      loyaltyLabel: loyaltyProgress.loyaltyTier.label,
      loyaltyPoints: loyaltyProgress.points,
      savedAt: new Date().toISOString(),
    });
  }, [data, loyaltyProgress.points, loyaltyProgress.loyaltyTier.label, identityEmail]);

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

  const handleLookupSubmit = () => {
    const normalizedEmail = normalizeCustomerEmail(lookupEmail);
    const nextFieldErrors: Partial<Record<"lookupEmail", string>> = {};

    if (!normalizedEmail) {
      nextFieldErrors.lookupEmail = "Inserisci un'email valida.";
    } else if (!isValidCustomerEmail(normalizedEmail)) {
      nextFieldErrors.lookupEmail = "Inserisci un indirizzo email valido.";
    }

    if (nextFieldErrors.lookupEmail) {
      setLoginFieldErrors(nextFieldErrors);
      setError("");
      scrollToFirstProfileField(["lookupEmail"]);
      return;
    }

    setLoginFieldErrors({});
    setError("");
    setLoginMode("confirm");
  };

  const requestLoginOtp = async () => {
    const normalizedEmail = normalizeCustomerEmail(lookupEmail);
    autoLoadedKeyRef.current = normalizedEmail;
    setLoading(true);
    setError("");
    setIsRegistering(false);
    setEmailChangeRequest(null);
    setEmailChangeCode("");
    setShowActivatedCardPanel(false);

    try {
      const response = await requestJson<{
        requestId: string;
        email: string;
        expiresAt: string;
        resendAvailableAt: string;
        attemptsRemaining: number;
      }>("/api/session/login-request", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setLoginRequest(response);
      setLoginCode("");
      setLoginMode("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile inviare il codice.");
      setLoginMode("lookup");
    } finally {
      setLoading(false);
    }
  };

  const resendLoginCode = async () => {
    if (!loginRequest) return;
    setResendingLogin(true);
    setError("");
    try {
      const response = await requestJson<{
        requestId: string;
        email: string;
        expiresAt: string;
        resendAvailableAt: string;
        attemptsRemaining: number;
      }>("/api/session/login-request", {
        method: "POST",
        body: JSON.stringify({ email: loginRequest.email }), // Assuming request API acts as resend if existing? Actually we didn't write a resend for login yet. Let's just create a new request!
      });
      setLoginRequest(response);
      setLoginCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile reinviare il codice.");
    } finally {
      setResendingLogin(false);
    }
  };

  const verifyLoginCode = async () => {
    if (!loginRequest) return;
    const code = loginCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setLoginFieldErrors({ loginCode: "Inserisci il codice a 6 cifre." });
      setError("");
      scrollToFirstProfileField(["loginCode"]);
      return;
    }

    setVerifyingLogin(true);
    setError("");
    setLoginFieldErrors({});

    try {
      const response = await requestJson<ProfileResponse>("/api/session/login-verify", {
        method: "POST",
        body: JSON.stringify({ requestId: loginRequest.requestId, code }),
      });

      applyProfileResponse(response);
      
      if (response.contact) {
        trackAppEvent("login_success", {
          app_section: "ciurma",
          login_method: "email_otp",
          profile_source: response.source,
          has_contact_code: Boolean(response.contact.CodiceContatto),
        });
        setIsEditingLookup(false);
        autoLoadedKeyRef.current = response.contact.Email || loginRequest.email;
        window.location.hash = "#riconoscimento";
      } else {
        setIsEditingLookup(true);
        autoLoadedKeyRef.current = "";
      }
      
      setLoginMode("lookup");
      setLoginRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codice non valido.");
    } finally {
      setVerifyingLogin(false);
    }
  };

  const startLongPress = () => {
    longPressRef.current = window.setTimeout(() => {
      longPressRef.current = null;
      const pin = prompt("Inserisci PIN Capitano:");
      if (pin) void handleBypassLogin(pin);
    }, 1500);
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handleBypassLogin = async (pin: string) => {
    const normalizedEmail = normalizeCustomerEmail(lookupEmail);
    if (!isValidCustomerEmail(normalizedEmail)) {
      setLoginFieldErrors({ lookupEmail: "Inserisci un indirizzo email valido." });
      setError("");
      scrollToFirstProfileField(["lookupEmail"]);
      return;
    }

    setLoading(true);
    setError("");
    setLoginFieldErrors({});
    setIsRegistering(false);
    setShowActivatedCardPanel(false);

    try {
      const response = await requestJson<ProfileResponse>("/api/session/login-bypass", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, pin }),
      });

      applyProfileResponse(response);
      
      if (response.contact) {
        trackAppEvent("login_success", {
          app_section: "ciurma",
          login_method: "bypass",
          profile_source: response.source,
          has_contact_code: Boolean(response.contact.CodiceContatto),
        });
        setIsEditingLookup(false);
        autoLoadedKeyRef.current = response.contact.Email || normalizedEmail;
        window.location.hash = "#riconoscimento";
      } else {
        setIsEditingLookup(true);
        autoLoadedKeyRef.current = "";
      }
      
      setLoginMode("lookup");
      setLoginRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN non valido o errore.");
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async () => {
    const isNewRegistration = isRegistering;
    const startTime = Date.now();
    const normalizedEmail = normalizeCustomerEmail(contactForm.email);
    const trimmedPhone = contactForm.phone.trim();
    const isPhoneRequired = isRegistering || didProfileStartWithPhone;
    const nextFieldErrors: Partial<
      Record<"firstName" | "lastName" | "email" | "phone", string>
    > = {};

    if (!contactForm.firstName.trim()) {
      nextFieldErrors.firstName = "Inserisci il nome.";
    }

    if (!contactForm.lastName.trim()) {
      nextFieldErrors.lastName = "Inserisci il cognome.";
    }

    if (!normalizedEmail || !isValidCustomerEmail(normalizedEmail)) {
      nextFieldErrors.email = "Inserisci un indirizzo email valido.";
    }

    if (!trimmedPhone && isPhoneRequired) {
      nextFieldErrors.phone = italianPhoneValidationError;
    } else if (trimmedPhone) {
      const normalizedPhoneResult = validateItalianPhone(trimmedPhone);
      if (!normalizedPhoneResult.ok) {
        nextFieldErrors.phone = normalizedPhoneResult.error;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setContactFieldErrors(nextFieldErrors);
      setContactError("");
      scrollToFirstProfileField(["firstName", "lastName", "email", "phone"]);
      return;
    }

    const normalizedPhone = trimmedPhone
      ? validateItalianPhone(trimmedPhone)
      : null;

    if (normalizedPhone && !normalizedPhone.ok) {
      setContactFieldErrors({ phone: normalizedPhone.error });
      setContactError("");
      scrollToFirstProfileField(["phone"]);
      return;
    }

    setSavingContact(true);
    setContactError("");
    setContactMessage("");
    setContactFieldErrors({});

    try {
      const profilePayload = {
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        phone:
          normalizedPhone && normalizedPhone.ok
            ? normalizedPhone.normalizedE164
            : "",
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

      if (isNewRegistration && response.contact?.CodiceContatto) {
        const contactCode = response.contact.CodiceContatto;
        const elapsed = Date.now() - startTime;
        if (elapsed < 1500) {
          await new Promise((resolve) => setTimeout(resolve, 1500 - elapsed));
        }

        try {
          const activationRes = await fetch("/api/profile/fidelity/activate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ contactCode }),
          });
          const activationBody = await activationRes.json().catch(() => null);
          if (activationRes.ok && activationBody?.profile) {
            applyProfileResponse(activationBody.profile);
            window.dispatchEvent(new Event("tortuga:profile-updated"));
          }
        } catch (activationErr) {
          console.error("Automatic fidelity activation failed:", activationErr);
        }
      }
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
    setContactFieldErrors({});
    setContactMessage("");
    setEmailChangeRequest(null);
    setEmailChangeCode("");
    setContactForm(contactSnapshot);
    setIsEditingProfile(true);
    // eslint-disable-next-line react-hooks/immutability
    window.location.hash = "#modifica";
  };

  const startRegistration = () => {
    const normalizedEmail = normalizeCustomerEmail(lookupEmail || identityEmail);
    setError("");
    setLoginFieldErrors({});
    setContactError("");
    setContactFieldErrors({});
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
    setLoginFieldErrors({});
    setIsEditingLookup(true);
    setIsEditingProfile(false);
    setIsRegistering(false);
    setContactForm(emptyContactForm);
    setContactError("");
    setContactFieldErrors({});
    setContactMessage("");
    setEmailChangeRequest(null);
    setEmailChangeCode("");
    setShowActivatedCardPanel(false);
    autoLoadedKeyRef.current = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      {/* ─── Modalità Offline ─────────────────────────────────────────────────── */}
      {!isOnline ? (
        <OfflinePassportScreen />
      ) : (<>

      {showLookupPanel ? (
        <ProfileLogin
          loginMode={loginMode}
          setLoginMode={setLoginMode}
          lookupEmail={lookupEmail}
          setLookupEmail={setLookupEmail}
          handleLookupSubmit={handleLookupSubmit}
          loading={loading}
          startLongPress={startLongPress}
          cancelLongPress={cancelLongPress}
          startRegistration={startRegistration}
          requestLoginOtp={requestLoginOtp}
          loginRequest={loginRequest}
          loginExpiresAtLabel={loginExpiresAtLabel}
          loginCode={loginCode}
          setLoginCode={setLoginCode}
          verifyLoginCode={verifyLoginCode}
          verifyingLogin={verifyingLogin}
          resendLoginCode={resendLoginCode}
          resendingLogin={resendingLogin}
          loginCanResend={loginCanResend}
          loginResendSeconds={loginResendSeconds}
          lookupEmailError={loginFieldErrors.lookupEmail ?? ""}
          loginCodeError={loginFieldErrors.loginCode ?? ""}
          clearLoginFieldErrors={clearLoginFieldErrors}
          setFieldRef={setFieldRef}
        />
      ) : null}

      {isRegistering || isEditingProfile ? (
        <ProfileEditor
          isRegistering={isRegistering}
          contactError={contactError}
          contactFieldErrors={contactFieldErrors}
          contactMessage={contactMessage}
          contactForm={contactForm}
          setContactForm={setContactForm}
          handlePhoneBlur={handlePhoneBlur}
          saveContact={saveContact}
          savingContact={savingContact}
          clearContactFieldErrors={clearContactFieldErrors}
          setFieldRef={setFieldRef}
        />
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

      {data?.contact ? (
        <>
          <ProfileDashboard
            data={data}
            loyaltyProgress={loyaltyProgress}
            missions={missions}
            setSelectedMission={setSelectedMission}
            triggerHaptic={triggerHaptic}
            hasOnPremiseAccess={hasOnPremiseAccess}
          />
          <ProfileGamesAndAdmin
            data={data}
            isLoggedAdmin={isLoggedAdmin}
            hasOnPremiseAccess={hasOnPremiseAccess}
            registerVisit={registerVisit}
          />

          <ProfilePassport
            data={data}
            contactSnapshot={contactSnapshot}
            identityEmail={identityEmail}
            profileName={profileName}
            loyaltyProgress={loyaltyProgress}
            contactError={contactError}
            contactMessage={contactMessage}
            isEditingProfile={isEditingProfile}
            isDataExpanded={isDataExpanded}
            setIsDataExpanded={setIsDataExpanded}
            activeCardCode={activeCardCode}
            showActivatedCardPanel={showActivatedCardPanel}
            contactCode={contactCode}
            handleFidelityActivated={handleFidelityActivated}
            triggerHaptic={triggerHaptic}
            setIsEditingProfile={setIsEditingProfile}
            setContactError={setContactError}
            setContactMessage={setContactMessage}
            openContactEditor={openContactEditor}
            changeAccount={changeAccount}
          />
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
      </>)}
    </section>
  );
}

export const ProfileScreen = CiurmaScreen;
