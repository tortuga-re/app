import { NextRequest, NextResponse } from "next/server";

import { saveLiveTvCustomerSubmission } from "@/lib/live-tv/customer-submissions";
import { saveLiveTvMediaFile } from "@/lib/live-tv/media-storage";
import type { LiveTvCustomerSubmission } from "@/lib/live-tv/types";
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

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const MAX_FILE_SIZE_BYTES = 80 * 1024 * 1024;

const cleanText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const media = formData.get("media");
    const title = cleanText(formData.get("title"));
    const uploaderName = cleanText(formData.get("uploaderName"));
    const uploaderEmail = normalizeCustomerEmail(cleanText(formData.get("uploaderEmail")));
    const contactCode = cleanText(formData.get("contactCode"));

    if (!(media instanceof File)) {
      return NextResponse.json({ error: "File mancante." }, { status: 400 });
    }

    if (!title || title.length > 120) {
      return NextResponse.json(
        { error: "Inserisci un titolo valido fino a 120 caratteri." },
        { status: 400 },
      );
    }

    if (!uploaderName || uploaderName.length > 120) {
      return NextResponse.json(
        { error: "Inserisci il nome con cui vuoi comparire in plancia." },
        { status: 400 },
      );
    }

    if (uploaderEmail && !isValidCustomerEmail(uploaderEmail)) {
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

    const mediaKind: "image" | "video" | null = media.type.startsWith("image/")
      ? "image"
      : media.type.startsWith("video/")
        ? "video"
        : null;

    if (
      (mediaKind === "image" && !ALLOWED_IMAGE_TYPES.has(media.type)) ||
      (mediaKind === "video" && !ALLOWED_VIDEO_TYPES.has(media.type)) ||
      !mediaKind
    ) {
      return NextResponse.json(
        { error: "Formato file non supportato. Usa foto o video compatibili." },
        { status: 400 },
      );
    }

    const storedMedia = await saveLiveTvMediaFile(media, mediaKind);
    const submission: LiveTvCustomerSubmission = {
      id: crypto.randomUUID(),
      kind: mediaKind,
      title,
      originalName: media.name,
      fileName: storedMedia.fileName,
      mediaUrl: storedMedia.mediaUrl,
      mimeType: media.type,
      sizeBytes: media.size,
      storageMode: storedMedia.storageMode,
      uploaderName,
      uploaderEmail: uploaderEmail || null,
      contactCode: contactCode || null,
      createdAt: new Date().toISOString(),
      status: "pending" as const,
      resolvedAt: null,
      resolution: null,
      linkedAssetId: null,
    };

    await saveLiveTvCustomerSubmission(submission);

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message:
        "Contenuto ricevuto. Il Capitano lo vedra in plancia prima di mandarlo in onda.",
    });
  } catch (error) {
    console.error("Live TV customer upload error:", error);
    return NextResponse.json(
      { error: "Errore durante l'invio del contenuto." },
      { status: 500 },
    );
  }
}
