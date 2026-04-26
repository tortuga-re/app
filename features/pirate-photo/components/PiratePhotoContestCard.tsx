"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ProfileResponse } from "@/lib/cooperto/types";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { triggerHaptic } from "@/lib/haptics";
import { piratePhotoPublicConfig } from "@/lib/pirate-photo/config";
import type { PiratePhotoUploadResponse } from "@/lib/pirate-photo/types";

type PiratePhotoContestCardProps = {
  contact: ProfileResponse["contact"] | null;
  onProfileResolved?: (profile: ProfileResponse) => void;
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
  phone: contact?.Telefono?.trim() || identity.phone,
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

const isRenderablePreview = (file: File) =>
  ["jpg", "jpeg", "png", "webp"].includes(getFileExtension(file)) &&
  (!file.type || ["image/jpeg", "image/png", "image/webp"].includes(file.type));

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
}: PiratePhotoContestCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { identity, updateIdentity } = useCustomerIdentity();
  const isKnownCustomer = Boolean(contact?.CodiceContatto?.trim());
  const [form, setForm] = useState<PiratePhotoFormState>(() =>
    buildInitialForm(contact, identity),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notificationWarning, setNotificationWarning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const previewUrl = useMemo(
    () => (photo && isRenderablePreview(photo) ? URL.createObjectURL(photo) : ""),
    [photo],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      return "Inserisci un numero di telefono valido.";
    }

    return "";
  };

  const submitPhoto = async () => {
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
    formData.set("phone", contact?.Telefono?.trim() || form.phone.trim());

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
    <div className="panel rounded-[2rem] p-5">
      <div className="space-y-2">
        <p className="eyebrow">Scatto del Mese</p>
        <h2 className="text-2xl font-semibold text-white">
          Mandaci la tua foto piu pirata.
        </h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Ogni mese la ciurma sceglie la migliore: cena omaggio per 2 persone.
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

      {!isKnownCustomer ? (
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
            fileInputRef.current?.click();
          }}
        >
          Scegli foto
        </button>

        <div className="overflow-hidden rounded-[1.55rem] border border-[rgba(216,176,106,0.2)] bg-black/22">
          {photo && previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt="Anteprima Scatto del Mese"
              className="max-h-72 w-full object-cover"
            />
          ) : (
            <div className="flex min-h-44 items-center justify-center px-5 text-center">
              <div>
                <p className="text-base font-semibold text-white">
                  {photo ? "Foto selezionata" : "Anteprima foto"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  {photo ? "Anteprima file" : "Scegli una foto per vederla qui"}
                </p>
              </div>
            </div>
          )}
          {photo ? (
            <p className="border-t border-[rgba(216,176,106,0.16)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
              {selectedPhotoLabel}
            </p>
          ) : null}
        </div>

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
