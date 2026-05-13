"use client";

import { useMemo, useRef, useState } from "react";

import type { ProfileResponse } from "@/lib/cooperto/types";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { triggerHaptic } from "@/lib/haptics";
import { piratePhotoPublicConfig } from "@/lib/pirate-photo/config";
import type { PiratePhotoUploadResponse } from "@/lib/pirate-photo/types";
import {
  italianPhoneValidationError,
  normalizeItalianPhone,
  validateItalianPhone,
} from "@/lib/validation/phone";

type PiratePhotoContestCardProps = {
  contact: ProfileResponse["contact"] | null;
  onProfileResolved?: (profile: ProfileResponse) => void;
  onVisitTrigger?: () => void;
};

type PiratePhotoFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const buildInitialForm = (
  contact: ProfileResponse["contact"] | null,
  identity: ReturnType<typeof useCustomerIdentity>["identity"],
): PiratePhotoFormState => ({
  firstName: contact?.Nome?.trim() || identity.firstName,
  lastName: contact?.Cognome?.trim() || identity.lastName,
  email: normalizeCustomerEmail(contact?.Email || identity.email),
  phone:
    normalizeItalianPhone(contact?.Telefono?.trim() || identity.phone)?.normalizedE164 ?? "",
});

const allowedMonthPhotoMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const getFileExtension = (file: File) =>
  file.name.split(".").pop()?.trim().toLowerCase() ?? "";

/* const isRenderablePreview = (file: File) =>
  ["jpg", "jpeg", "png", "webp"].includes(getFileExtension(file)) &&
  (!file.type || ["image/jpeg", "image/png", "image/webp"].includes(file.type)); */

const validatePhoto = (file: File) => {
  const extension = getFileExtension(file);

  if (
    !piratePhotoPublicConfig.monthPhotoAllowedExtensions.includes(
      extension as (typeof piratePhotoPublicConfig.monthPhotoAllowedExtensions)[number],
    )
  ) {
    return "Formato foto non supportato. Usa JPG, PNG, WEBP, HEIC o HEIF.";
  }

  if (file.type && !allowedMonthPhotoMimeTypes.has(file.type)) {
    return "Formato foto non supportato. Usa JPG, PNG, WEBP, HEIC o HEIF.";
  }

  if (file.size <= 0) {
    return "Seleziona una foto valida.";
  }

  if (file.size > piratePhotoPublicConfig.maxUploadBytes) {
    return "La foto supera il limite di 5 MB.";
  }

  return "";
};

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) {
    return `${Math.max(Math.round(size / 1024), 1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function PiratePhotoContestCard({
  contact,
  onProfileResolved,
  onVisitTrigger,
}: PiratePhotoContestCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { identity, updateIdentity } = useCustomerIdentity();
  const isKnownCustomer = Boolean(contact?.CodiceContatto?.trim());
  const hasFullIdentity = Boolean(identity.email && identity.firstName && identity.lastName);
  const shouldHideFields = isKnownCustomer || hasFullIdentity;

  const [form, setForm] = useState<PiratePhotoFormState>(() =>
    buildInitialForm(contact, identity),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notificationWarning, setNotificationWarning] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedPhotoLabel = useMemo(() => {
    if (!photo) {
      return "";
    }

    return `${photo.name} - ${formatFileSize(photo.size)}`;
  }, [photo]);

  const selectPhoto = (file?: File) => {
    if (!file) {
      return;
    }

    const validationError = validatePhoto(file);

    if (validationError) {
      setError(validationError);
      setPhoto(null);
      return;
    }

    setPhoto(file);
    setError("");
    setSuccess("");
    setNotificationWarning("");
  };

  const validateForm = () => {
    if (!photo) {
      return "Seleziona una foto.";
    }

    if (isKnownCustomer) {
      return "";
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      return "Inserisci nome e cognome.";
    }

    if (!isValidCustomerEmail(form.email)) {
      return "Inserisci un indirizzo email valido.";
    }

    if (!form.phone.trim()) {
      return italianPhoneValidationError;
    }

    const normalizedPhone = validateItalianPhone(form.phone);
    if (!normalizedPhone.ok) {
      return normalizedPhone.error;
    }

    return "";
  };

  const submitPhoto = async () => {
    onVisitTrigger?.();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!photo) {
      return;
    }

    const formData = new FormData();
    formData.set("photo", photo);
    formData.set("contactCode", contact?.CodiceContatto?.trim() ?? "");
    formData.set("firstName", contact?.Nome?.trim() || form.firstName.trim());
    formData.set("lastName", contact?.Cognome?.trim() || form.lastName.trim());
    formData.set("email", normalizeCustomerEmail(contact?.Email || form.email));
    formData.set(
      "phone",
      contact?.Telefono?.trim() ||
        normalizeItalianPhone(form.phone)?.normalizedE164 ||
        form.phone.trim(),
    );

    setSubmitting(true);
    setError("");
    setSuccess("");
    setNotificationWarning("");

    try {
      const response = await fetch("/api/pirate-photo/upload", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as
        | (PiratePhotoUploadResponse & { error?: string })
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "Non sono riuscito a inviare la foto.");
      }

      if (body.profile?.contact) {
        onProfileResolved?.(body.profile);
        updateIdentity({
          email: body.profile.contact.Email || form.email,
          firstName: body.profile.contact.Nome,
          lastName: body.profile.contact.Cognome,
          phone: body.profile.contact.Telefono,
          marketingConsent:
            typeof body.profile.contact.ConsensoMarketing === "number"
              ? body.profile.contact.ConsensoMarketing === 1
              : true,
        });
      }

      setPhoto(null);
      setSuccess(body.message || "Foto ricevuta, pirata.");
      setNotificationWarning(body.notificationMessage ?? "");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Non sono riuscito a inviare la foto.",
      );
    } finally {
      setSubmitting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="panel rounded-[2rem] p-5 border-2 border-[var(--accent-strong)]/30 bg-[var(--accent-strong)]/5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--accent-strong)]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M17 7h4v4" />
            <path d="M2 20h20" opacity="0.3" />
            <circle cx="12" cy="12" r="9" opacity="0.1" />
          </svg>
          <p className="eyebrow text-[var(--accent-strong)]">Bottino del Mese</p>
        </div>
        <h2 className="text-2xl font-semibold text-white">
          Mandaci la tua foto piu pirata.
        </h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Ogni mese la ciurma sceglie la migliore: <span className="text-[var(--accent-strong)] font-bold italic">cena omaggio per 2 persone.</span>
        </p>
      </div>

      {success ? (
        <div className="mt-4 rounded-[1.5rem] border border-[rgba(216,176,106,0.2)] bg-[rgba(216,176,106,0.08)] px-4 py-4">
          <p className="text-base font-semibold text-white">{success}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            La ciurma la valutera per lo Scatto del Mese.
          </p>
          {notificationWarning ? (
            <p className="mt-3 rounded-[1rem] border border-[rgba(216,176,106,0.2)] bg-black/20 px-3 py-2 text-xs leading-5 text-[var(--accent-strong)]">
              {notificationWarning}
            </p>
          ) : null}
        </div>
      ) : null}

      {!shouldHideFields ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--text-muted)]">
              <span>Nome</span>
              <input
                className="field"
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </label>
            <label className="space-y-2 text-sm text-[var(--text-muted)]">
              <span>Cognome</span>
              <input
                className="field"
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
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
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: normalizeCustomerEmail(event.target.value),
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm text-[var(--text-muted)]">
              <span>Telefono</span>
              <input
                className="field"
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept={piratePhotoPublicConfig.monthPhotoAccept}
          onChange={(event) => selectPhoto(event.target.files?.[0])}
        />

        <button
          type="button"
          className="button-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm"
          onClick={() => {
            triggerHaptic();
            onVisitTrigger?.();
            fileInputRef.current?.click();
          }}
        >
          Scegli foto
        </button>

        {photo ? (
          <div className="rounded-[1.2rem] border border-[rgba(216,176,106,0.2)] bg-black/22 px-4 py-3">
            <p className="text-xs leading-5 text-[var(--accent-strong)]">
              Foto selezionata:
            </p>
            <p className="text-sm font-medium text-white truncate">
              {selectedPhotoLabel}
            </p>
          </div>
        ) : null}

        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Inviando la foto accetti che venga valutata dallo staff Tortuga.
          Eventuale pubblicazione sui social avverra previo contatto diretto.
        </p>

        {error ? (
          <div className="rounded-[1.4rem] border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          className="button-primary flex min-h-12 w-full items-center justify-center px-5 text-sm"
          onClick={() => {
            triggerHaptic();
            void submitPhoto();
          }}
          disabled={submitting}
        >
          {submitting ? "Invio foto..." : "Invia foto"}
        </button>
      </div>
    </div>
  );
}
