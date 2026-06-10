"use client";

import { useMemo, useRef, useState } from "react";

import type { ProfileResponse } from "@/lib/cooperto/types";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import { triggerHaptic } from "@/lib/haptics";

type LiveTvContributionCardProps = {
  contact: ProfileResponse["contact"] | null;
  onVisitTrigger?: () => void;
};

type ContributionFormState = {
  title: string;
  uploaderName: string;
  uploaderEmail: string;
};

const ACCEPT_ATTRIBUTE =
  "image/*,video/mp4,video/webm,video/ogg,video/quicktime,image/heic,image/heif";
const MAX_FILE_SIZE_BYTES = 80 * 1024 * 1024;

const buildInitialForm = (
  contact: ProfileResponse["contact"] | null,
  identity: ReturnType<typeof useCustomerIdentity>["identity"],
): ContributionFormState => ({
  title: "",
  uploaderName:
    `${contact?.Nome?.trim() || identity.firstName} ${contact?.Cognome?.trim() || identity.lastName}`.trim(),
  uploaderEmail: normalizeCustomerEmail(contact?.Email || identity.email),
});

const getFileExtension = (file: File) =>
  file.name.split(".").pop()?.trim().toLowerCase() ?? "";

const isSupportedFile = (file: File) => {
  const extension = getFileExtension(file);

  if (file.type.startsWith("image/")) {
    return ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(extension);
  }

  if (file.type.startsWith("video/")) {
    return ["mp4", "webm", "ogg", "ogv", "mov"].includes(extension);
  }

  return false;
};

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) {
    return `${Math.max(Math.round(size / 1024), 1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function LiveTvContributionCard({
  contact,
  onVisitTrigger,
}: LiveTvContributionCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { identity } = useCustomerIdentity();
  const [form, setForm] = useState(() => buildInitialForm(contact, identity));
  const [media, setMedia] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shouldHideIdentityFields = Boolean(
    contact?.CodiceContatto?.trim() || (form.uploaderName && form.uploaderEmail),
  );

  const selectedFileLabel = useMemo(() => {
    if (!media) {
      return "";
    }

    return `${media.name} - ${formatFileSize(media.size)}`;
  }, [media]);

  const selectFile = (file?: File) => {
    if (!file) {
      return;
    }

    if (!isSupportedFile(file)) {
      setError("Formato non supportato. Usa foto o video compatibili.");
      setMedia(null);
      return;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      setError("Il file e troppo pesante o non valido.");
      setMedia(null);
      return;
    }

    setMedia(file);
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Inserisci il titolo che andra in live.";
    }

    if (form.title.trim().length > 120) {
      return "Il titolo puo avere massimo 120 caratteri.";
    }

    if (!media) {
      return "Seleziona una foto o un video.";
    }

    if (!form.uploaderName.trim()) {
      return "Inserisci il nome con cui invii il contenuto.";
    }

    if (form.uploaderEmail && !isValidCustomerEmail(form.uploaderEmail)) {
      return "Inserisci un'email valida.";
    }

    return "";
  };

  const submitContribution = async () => {
    onVisitTrigger?.();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!media) {
      return;
    }

    const formData = new FormData();
    formData.set("media", media);
    formData.set("title", form.title.trim());
    formData.set("uploaderName", form.uploaderName.trim());
    formData.set("uploaderEmail", normalizeCustomerEmail(form.uploaderEmail));
    formData.set("contactCode", contact?.CodiceContatto?.trim() ?? "");

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/live-tv/customer-upload", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string; error?: string }
        | null;

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || "Invio non riuscito.");
      }

      setMedia(null);
      setForm((current) => ({
        ...current,
        title: "",
      }));
      setSuccess(
        body.message ||
          "Contenuto ricevuto. Il Capitano lo vedra in plancia prima di mandarlo in onda.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Invio non riuscito.",
      );
    } finally {
      setSubmitting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="panel rounded-[2rem] border border-[rgba(216,176,106,0.28)] bg-[rgba(216,176,106,0.06)] p-5">
      <div className="space-y-2">
        <p className="eyebrow text-[var(--accent-strong)]">Contributi Live</p>
        <h2 className="text-2xl font-semibold text-white">
          Invia la tua foto o il tuo video della serata.
        </h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Aggiungi un titolo e carica il tuo contenuto: il migliore sara premiato con
          <span className="font-bold text-[var(--accent-strong)]"> una bottiglia di vino omaggio</span>.
        </p>
      </div>

      {success ? (
        <div className="mt-4 rounded-[1.5rem] border border-[rgba(216,176,106,0.2)] bg-[rgba(216,176,106,0.08)] px-4 py-4">
          <p className="text-base font-semibold text-white">{success}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Lo staff lo vedra prima di pubblicarlo in libreria o in scaletta.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <label className="space-y-2 text-sm text-[var(--text-muted)]">
          <span>Titolo che andra in live</span>
          <input
            className="field"
            value={form.title}
            maxLength={120}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Es. Tavolata in tempesta"
          />
        </label>

        {!shouldHideIdentityFields ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--text-muted)]">
              <span>Nome</span>
              <input
                className="field"
                value={form.uploaderName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    uploaderName: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm text-[var(--text-muted)]">
              <span>Email</span>
              <input
                className="field"
                type="email"
                value={form.uploaderEmail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    uploaderEmail: normalizeCustomerEmail(event.target.value),
                  }))
                }
              />
            </label>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={(event) => selectFile(event.target.files?.[0])}
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
          Scegli foto o video
        </button>

        {media ? (
          <div className="rounded-[1.2rem] border border-[rgba(216,176,106,0.2)] bg-black/22 px-4 py-3">
            <p className="text-xs leading-5 text-[var(--accent-strong)]">
              File selezionato:
            </p>
            <p className="truncate text-sm font-medium text-white">
              {selectedFileLabel}
            </p>
          </div>
        ) : null}

        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Il contenuto non va in onda automaticamente: prima passa dalla plancia del
          Capitano per approvazione.
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
            void submitContribution();
          }}
          disabled={submitting}
        >
          {submitting ? "Invio contenuto..." : "Invia contributo"}
        </button>
      </div>
    </div>
  );
}
