"use client";

import { useRef, useState } from "react";

import { piratePhotoPublicConfig } from "@/lib/pirate-photo/config";
import { storageKeys } from "@/lib/config";
import { triggerHaptic } from "@/lib/haptics";
import {
  removeLocalStorageValue,
  useHydratedLocalStorageState,
} from "@/lib/local-storage-state";

type LocalPirateAvatarProps = {
  customerKey: string;
  label: string;
  onUpload?: (url: string) => void;
};

const avatarMaxBytes = 5 * 1024 * 1024;
const allowedAvatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedAvatarExtensions = new Set<string>(
  piratePhotoPublicConfig.avatarAllowedExtensions,
);

const getAvatarStorageKey = (customerKey: string) =>
  `${storageKeys.customerAvatarPrefix}:${customerKey.trim().toLowerCase() || "ospite"}`;

const getFileExtension = (file: File) =>
  file.name.split(".").pop()?.trim().toLowerCase() ?? "";

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Immagine non leggibile."));
    image.src = url;
  });

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Non riesco a salvare l'avatar."));
    reader.readAsDataURL(blob);
  });

const compressAvatar = async (file: File) => {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    const size = 512;
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max((image.naturalWidth - sourceSize) / 2, 0);
    const sourceY = Math.max((image.naturalHeight - sourceSize) / 2, 0);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas non disponibile.");
    }

    canvas.width = size;
    canvas.height = size;
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });

    if (!blob) {
      throw new Error("Non riesco a comprimere l'avatar.");
    }

    return blobToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const validateAvatarFile = (file: File) => {
  const extension = getFileExtension(file);

  if (!allowedAvatarExtensions.has(extension)) {
    return "Formato non supportato. Usa JPG, PNG o WEBP.";
  }

  if (file.type && !allowedAvatarMimeTypes.has(file.type)) {
    return "Formato non supportato. Usa JPG, PNG o WEBP.";
  }

  if (file.size <= 0) {
    return "Seleziona una foto valida.";
  }

  if (file.size > avatarMaxBytes) {
    return "La foto supera il limite di 5 MB.";
  }

  return "";
};

export function LocalPirateAvatar({ customerKey, label, onUpload }: LocalPirateAvatarProps) {
  const storageKey = getAvatarStorageKey(customerKey);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useHydratedLocalStorageState(
    storageKey,
    "",
    (raw) => raw,
    (value) => value,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");

  const saveAvatarFile = async (file?: File) => {
    if (!file) {
      return;
    }

    const validationError = validateAvatarFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const dataUrl = await compressAvatar(file);
      setAvatar(dataUrl);
      
      // Upload to server
      const res = await fetch("/api/match-drink/upload-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: dataUrl }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (onUpload) onUpload(url);
      }

      setMenuOpen(false);
      setError("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Non riesco a salvare l'avatar.",
      );
    } finally {
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }

      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  };

  const removeAvatar = () => {
    removeLocalStorageValue(storageKey);
    setAvatar("");
    setMenuOpen(false);
    setPreviewOpen(false);
    setError("");
  };

  const openMenu = () => {
    triggerHaptic();
    setMenuOpen((current) => !current);
  };

  return (
    <div className={`relative shrink-0 ${menuOpen ? "z-[60]" : "z-10"}`}>
      <button
        type="button"
        className="group flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[rgba(216,176,106,0.45)] bg-[radial-gradient(circle_at_35%_25%,rgba(242,215,165,0.2),rgba(40,20,12,0.94)_62%)] shadow-[0_18px_42px_rgba(0,0,0,0.42)] transition active:scale-[0.98]"
        aria-label={avatar ? "Apri menu avatar" : "Aggiungi avatar"}
        onClick={openMenu}
      >
        {avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatar}
            alt={`Avatar di ${label}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl font-light text-[var(--accent-strong)] transition group-active:scale-90">
            +
          </span>
        )}
      </button>

      {menuOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.55rem)] z-50 w-52 rounded-[1.25rem] border border-[rgba(216,176,106,0.26)] bg-[rgba(18,11,8,0.98)] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.48)]">
          {avatar ? (
            <button
              type="button"
              className="w-full rounded-[0.95rem] px-3 py-2 text-left text-sm text-white transition hover:bg-white/8"
              onClick={() => {
                triggerHaptic();
                setPreviewOpen(true);
                setMenuOpen(false);
              }}
            >
              Mostra
            </button>
          ) : null}
          {!avatar ? (
            <button
              type="button"
              className="w-full rounded-[0.95rem] px-3 py-2 text-left text-sm text-white transition hover:bg-white/8"
              onClick={() => {
                triggerHaptic();
                setMenuOpen(false);
                cameraInputRef.current?.click();
              }}
            >
              Scatta foto
            </button>
          ) : null}
          <button
            type="button"
            className="w-full rounded-[0.95rem] px-3 py-2 text-left text-sm text-white transition hover:bg-white/8"
            onClick={() => {
              triggerHaptic();
              setMenuOpen(false);
              galleryInputRef.current?.click();
            }}
          >
            {avatar ? "Modifica" : "Seleziona dalla galleria"}
          </button>
          {avatar ? (
            <button
              type="button"
              className="w-full rounded-[0.95rem] px-3 py-2 text-left text-sm text-[var(--danger)] transition hover:bg-[rgba(240,139,117,0.1)]"
              onClick={() => {
                triggerHaptic();
                removeAvatar();
              }}
            >
              Rimuovi
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="absolute left-0 top-[calc(100%+0.55rem)] z-10 min-w-64 rounded-[1rem] border border-[rgba(240,139,117,0.24)] bg-[rgba(30,10,8,0.98)] px-3 py-2 text-xs leading-5 text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <input
        ref={cameraInputRef}
        className="hidden"
        type="file"
        accept={piratePhotoPublicConfig.avatarAccept}
        capture="user"
        onChange={(event) => {
          void saveAvatarFile(event.target.files?.[0]);
        }}
      />
      <input
        ref={galleryInputRef}
        className="hidden"
        type="file"
        accept={piratePhotoPublicConfig.avatarAccept}
        onChange={(event) => {
          void saveAvatarFile(event.target.files?.[0]);
        }}
      />

      {previewOpen && avatar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="max-w-sm rounded-[2rem] border border-[rgba(216,176,106,0.32)] bg-[rgba(18,11,8,0.96)] p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt={`Avatar di ${label}`}
              className="aspect-square w-full rounded-full object-cover"
            />
            <button
              type="button"
              className="button-secondary mt-5 inline-flex min-h-11 w-full items-center justify-center px-5 text-sm"
              onClick={() => setPreviewOpen(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
