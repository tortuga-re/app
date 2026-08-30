import { NextRequest, NextResponse } from "next/server";

import { saveLiveTvCustomerSubmission } from "@/lib/live-tv/customer-submissions";
import { saveLiveTvMediaFile } from "@/lib/live-tv/media-storage";
import { sendNowPlaying } from "@/lib/live-tv/store";
import type { LiveTvCustomerSubmission } from "@/lib/live-tv/types";
import { updateProfileContact } from "@/lib/cooperto/service";
import {
  attachCustomerSessionCookie,
  getCustomerSession,
  normalizeCustomerSessionIdentity,
} from "@/lib/session/customer-session";
import {
  isValidProfileEmail as isValidCustomerEmail,
  normalizeProfileEmail as normalizeCustomerEmail,
} from "@/lib/profile/validation";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const cleanText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const media = formData.get("media");
    const uploaderName = cleanText(formData.get("uploaderName"));
    const uploaderEmail = normalizeCustomerEmail(cleanText(formData.get("uploaderEmail")));
    const session = getCustomerSession(req);

    if (!(media instanceof File)) {
      return NextResponse.json({ error: "File mancante." }, { status: 400 });
    }

    if (!session && (!uploaderName || uploaderName.length > 120)) {
      return NextResponse.json(
        { error: "Inserisci il nome con cui vuoi comparire in plancia." },
        { status: 400 },
      );
    }

    if (!session && (!uploaderEmail || !isValidCustomerEmail(uploaderEmail))) {
      return NextResponse.json(
        { error: "Email non valida." },
        { status: 400 },
      );
    }

    if (media.size <= 0 || media.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File non valido o troppo pesante." },
        { status: 400 },
      );
    }

    const mediaKind: "image" | null = media.type.startsWith("image/") ? "image" : null;

    if (
      !ALLOWED_IMAGE_TYPES.has(media.type) ||
      !mediaKind
    ) {
      return NextResponse.json(
        { error: "Formato non supportato. Invia una foto JPG, PNG, WebP, GIF o HEIC." },
        { status: 400 },
      );
    }

    let identity = session;
    if (!identity) {
      const profile = await updateProfileContact({
        firstName: uploaderName,
        lastName: "",
        email: uploaderEmail,
        phone: "",
        marketingConsent: false,
      });
      identity = normalizeCustomerSessionIdentity({
        firstName: profile.contact?.Nome || uploaderName,
        lastName: profile.contact?.Cognome || "",
        email: profile.contact?.Email || uploaderEmail,
        phone: profile.contact?.Telefono || "",
        marketingConsent: false,
      });
      if (!identity) throw new Error("Contatto Cooperto non disponibile.");
    }

    const storedMedia = await saveLiveTvMediaFile(media, mediaKind);
    const submission: LiveTvCustomerSubmission = {
      id: crypto.randomUUID(),
      kind: mediaKind,
      title: "Foto Live",
      originalName: media.name,
      fileName: storedMedia.fileName,
      mediaUrl: storedMedia.mediaUrl,
      mimeType: media.type,
      sizeBytes: media.size,
      storageMode: storedMedia.storageMode,
      uploaderName: null,
      uploaderEmail: null,
      contactCode: null,
      createdAt: new Date().toISOString(),
      status: "pending" as const,
      resolvedAt: null,
      resolution: null,
      linkedAssetId: null,
    };

    await saveLiveTvCustomerSubmission(submission);

    await sendNowPlaying({
      type: "image",
      title: "Foto Live",
      mediaUrl: storedMedia.mediaUrl,
      durationSeconds: 10,
      enabled: true,
      styleVariant: "default",
    });

    const response = NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: "Foto inviata in diretta. Grazie, ciurma!",
    });
    return attachCustomerSessionCookie(response, identity);
  } catch (error) {
    console.error("Live TV customer upload error:", error);
    return NextResponse.json(
      { error: "Errore durante l'invio del contenuto." },
      { status: 500 },
    );
  }
}
