"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogOut, MailCheck, UserRoundCog, X } from "lucide-react";

import { requestJson } from "@/lib/client";
import { toDateInputValue } from "@/lib/customer-profile";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import type { ProfileResponse, ProfileUpdateInput } from "@/lib/cooperto/types";
import type { EmailChangeRequestResponse } from "@/lib/profile-email-change/types";
import { normalizeItalianPhone, validateItalianPhone } from "@/lib/validation/phone";

type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  marketingConsent: boolean;
};

type FieldName = "firstName" | "lastName" | "email" | "phone";
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyForm: ContactForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  marketingConsent: false,
};

const toForm = (profile: ProfileResponse): ContactForm => ({
  firstName: profile.contact?.Nome?.trim() ?? "",
  lastName: profile.contact?.Cognome?.trim() ?? "",
  email: normalizeCustomerEmail(profile.contact?.Email || profile.query),
  phone: normalizeItalianPhone(profile.contact?.Telefono ?? "")?.nationalNumber ?? "",
  birthDate: toDateInputValue(profile.contact?.DataDiNascita),
  marketingConsent: profile.contact?.ConsensoMarketing === 1,
});

export function ProfileEditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { identity, updateIdentity, clearCustomerContext } = useCustomerIdentity();
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [originalEmail, setOriginalEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [emailRequest, setEmailRequest] = useState<EmailChangeRequestResponse | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resending, setResending] = useState(false);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (!open || !identity.email) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      setEmailRequest(null);
      setOtpCode("");
      try {
        const params = new URLSearchParams({ mode: "email", query: identity.email });
        const profile = await requestJson<ProfileResponse>(`/api/profile?${params.toString()}`, { cache: "no-store" });
        if (cancelled) return;
        const nextForm = toForm(profile);
        setForm(nextForm);
        setOriginalEmail(nextForm.email);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Non riesco a caricare i dati cliente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [identity.email, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  useEffect(() => {
    if (!emailRequest) return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [emailRequest]);

  const resendSeconds = useMemo(() => emailRequest
    ? Math.max(0, Math.ceil((Date.parse(emailRequest.resendAvailableAt) - clock) / 1000))
    : 0, [clock, emailRequest]);

  if (!open) return null;

  const clearFieldError = (field: FieldName) => setFieldErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });

  const applySavedProfile = (profile: ProfileResponse) => {
    const saved = toForm(profile);
    setForm(saved);
    setOriginalEmail(saved.email);
    updateIdentity({
      email: saved.email,
      firstName: saved.firstName,
      lastName: saved.lastName,
      phone: saved.phone,
      marketingConsent: saved.marketingConsent,
    });
    window.dispatchEvent(new Event("tortuga:profile-updated"));
  };

  const buildPayload = (): ProfileUpdateInput | null => {
    const normalizedEmail = normalizeCustomerEmail(form.email);
    const errors: FieldErrors = {};
    if (!form.firstName.trim()) errors.firstName = "Inserisci il nome.";
    if (!form.lastName.trim()) errors.lastName = "Inserisci il cognome.";
    if (!isValidCustomerEmail(normalizedEmail)) errors.email = "Inserisci un indirizzo email valido.";

    const phoneResult = form.phone.trim() ? validateItalianPhone(form.phone) : null;
    if (phoneResult && !phoneResult.ok) errors.phone = phoneResult.error;
    setFieldErrors(errors);
    if (Object.keys(errors).length) return null;

    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: normalizedEmail,
      phone: phoneResult?.ok ? phoneResult.normalizedE164 : "",
      birthDate: form.birthDate || undefined,
      marketingConsent: form.marketingConsent,
    };
  };

  const save = async () => {
    const profile = buildPayload();
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (profile.email !== originalEmail) {
        const response = await requestJson<EmailChangeRequestResponse>("/api/profile/email-change/request", {
          method: "POST",
          body: JSON.stringify({ currentEmail: originalEmail, profile }),
        });
        setEmailRequest(response);
        setClock(Date.now());
        setOtpCode("");
        return;
      }

      const response = await requestJson<ProfileResponse>("/api/profile", {
        method: "POST",
        body: JSON.stringify(profile),
      });
      applySavedProfile(response);
      setMessage("Dati cliente aggiornati correttamente.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Non riesco a salvare i dati cliente.");
    } finally {
      setSaving(false);
    }
  };

  const verifyEmail = async () => {
    if (!emailRequest || !/^\d{6}$/.test(otpCode.trim())) {
      setError("Inserisci il codice a 6 cifre ricevuto sulla nuova email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await requestJson<ProfileResponse>("/api/profile/email-change/verify", {
        method: "POST",
        body: JSON.stringify({ requestId: emailRequest.requestId, code: otpCode.trim() }),
      });
      applySavedProfile(response);
      setEmailRequest(null);
      setOtpCode("");
      setMessage("Nuova email verificata e dati aggiornati.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Codice non valido o scaduto.");
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    if (!emailRequest || resendSeconds > 0) return;
    setResending(true);
    setError("");
    try {
      const response = await requestJson<EmailChangeRequestResponse>("/api/profile/email-change/resend", {
        method: "POST",
        body: JSON.stringify({ requestId: emailRequest.requestId }),
      });
      setEmailRequest(response);
      setClock(Date.now());
      setOtpCode("");
      setMessage("Nuovo codice inviato.");
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Non riesco a reinviare il codice.");
    } finally {
      setResending(false);
    }
  };

  const leaveProfile = (destination: string) => {
    clearCustomerContext();
    onClose();
    window.location.assign(destination);
  };

  return <div className="profile-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="profile-edit-modal">
      <header><div><p className="minimal-eyebrow">Modifica profilo</p><h2 id="profile-edit-title">Aggiorna i tuoi dati</h2></div><button type="button" onClick={onClose} aria-label="Chiudi modifica dati"><X /></button></header>

      {loading ? <div className="profile-edit-status">Recupero i dati da Cooperto…</div> : null}
      {error ? <div className="profile-edit-alert error">{error}</div> : null}
      {message ? <div className="profile-edit-alert success"><CheckCircle2 />{message}</div> : null}

      {!loading && !emailRequest ? <div className="profile-edit-form">
        <div className="profile-edit-grid">
          <Field label="Nome" value={form.firstName} error={fieldErrors.firstName} onChange={(value) => { clearFieldError("firstName"); setForm((current) => ({ ...current, firstName: value })); }} />
          <Field label="Cognome" value={form.lastName} error={fieldErrors.lastName} onChange={(value) => { clearFieldError("lastName"); setForm((current) => ({ ...current, lastName: value })); }} />
          <Field label="Email" type="email" value={form.email} error={fieldErrors.email} onChange={(value) => { clearFieldError("email"); setForm((current) => ({ ...current, email: value })); }} />
          <Field label="Telefono" inputMode="numeric" prefix="+39" value={form.phone} error={fieldErrors.phone} onChange={(value) => { clearFieldError("phone"); setForm((current) => ({ ...current, phone: value.replace(/\D/g, "") })); }} />
        </div>
        <Field label="Data di nascita" type="date" value={form.birthDate} onChange={(value) => setForm((current) => ({ ...current, birthDate: value }))} />
        <label className="profile-marketing"><input type="checkbox" checked={form.marketingConsent} onChange={(event) => setForm((current) => ({ ...current, marketingConsent: event.target.checked }))} /><span>Accetto comunicazioni marketing future di Tortuga.</span></label>
        <button type="button" className="minimal-primary w-full" disabled={saving || Boolean(error && !originalEmail)} onClick={() => void save()}>{saving ? "Salvataggio…" : "Salva modifiche"}</button>
        <div className="profile-session-actions">
          <button type="button" disabled={saving} onClick={() => leaveProfile("/ciurma?recognition=1")}><UserRoundCog />Cambia profilo</button>
          <button type="button" disabled={saving} onClick={() => leaveProfile("/")}><LogOut />Esci</button>
        </div>
      </div> : null}

      {!loading && emailRequest ? <div className="profile-otp-step">
        <div className="profile-otp-icon"><MailCheck /></div>
        <h3>Verifica la nuova email</h3>
        <p>Abbiamo inviato un codice a 6 cifre a <strong>{emailRequest.pendingEmail}</strong>. La vecchia email resta attiva fino alla verifica.</p>
        <Field label="Codice di verifica" inputMode="numeric" value={otpCode} onChange={(value) => setOtpCode(value.replace(/\D/g, "").slice(0, 6))} />
        <button type="button" className="minimal-primary w-full" disabled={saving || otpCode.length !== 6} onClick={() => void verifyEmail()}>{saving ? "Verifica…" : "Verifica e salva"}</button>
        <button type="button" className="profile-resend" disabled={resending || resendSeconds > 0} onClick={() => void resend()}>{resendSeconds > 0 ? `Reinvia tra ${resendSeconds}s` : resending ? "Invio…" : "Reinvia codice"}</button>
      </div> : null}
    </section>
  </div>;
}

function Field({ label, value, onChange, error, type = "text", inputMode, prefix }: { label: string; value: string; onChange: (value: string) => void; error?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; prefix?: string }) {
  return <label className="profile-edit-field"><span>{label}</span><div className={prefix ? "has-prefix" : ""}>{prefix ? <i>{prefix}</i> : null}<input type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} /></div>{error ? <small>{error}</small> : null}</label>;
}
