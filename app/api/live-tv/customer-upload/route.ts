import { NextRequest, NextResponse } from "next/server";

import { saveLiveTvCustomerSubmission } from "@/lib/live-tv/customer-submissions";
import { saveLiveTvMediaAsset } from "@/lib/live-tv/media-library";
import { saveLiveTvMediaFile } from "@/lib/live-tv/media-storage";
import { sendNowPlaying } from "@/lib/live-tv/store";
import type { LiveTvCustomerSubmission, LiveTvMediaAsset } from "@/lib/live-tv/types";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const media = formData.get("media");

    if (!(media instanceof File)) {
      return NextResponse.json({ error: "File mancante." }, { status: 400 });
    }

    if (media.size <= 0 || media.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File non valido o troppo pesante (max 20MB)." },
        { status: 400 },
      );
    }

    const mediaKind: "image" | null = media.type.startsWith("image/") ? "image" : null;

    if (!ALLOWED_IMAGE_TYPES.has(media.type) || !mediaKind) {
      return NextResponse.json(
        { error: "Formato non supportato. Invia una foto JPG, PNG, WebP, GIF o HEIC." },
        { status: 400 },
      );
    }

    const storedMedia = await saveLiveTvMediaFile(media, mediaKind, {
      optimizeImage: true,
    });

    const nowIso = new Date().toISOString();
    const submissionId = crypto.randomUUID();

    const submission: LiveTvCustomerSubmission = {
      id: submissionId,
      kind: mediaKind,
      title: "Foto Live",
      originalName: media.name,
      fileName: storedMedia.fileName,
      mediaUrl: storedMedia.mediaUrl,
      mimeType: storedMedia.mimeType,
      sizeBytes: storedMedia.sizeBytes,
      storageMode: storedMedia.storageMode,
      uploaderName: "Ospite",
      uploaderEmail: null,
      contactCode: null,
      createdAt: nowIso,
      status: "approved",
      resolvedAt: nowIso,
      resolution: "library",
      linkedAssetId: submissionId,
      likesCount: 0,
      likedByDevices: [],
    };

    // Save submission for live carousel
    await saveLiveTvCustomerSubmission(submission);

    // Save as media asset so admin can view it in Media Library
    const mediaAsset: LiveTvMediaAsset = {
      id: submissionId,
      kind: "image",
      title: `Foto Live - ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
      originalName: media.name,
      fileName: storedMedia.fileName,
      mediaUrl: storedMedia.mediaUrl,
      mimeType: storedMedia.mimeType,
      sizeBytes: storedMedia.sizeBytes,
      storageMode: storedMedia.storageMode as any,
      createdAt: nowIso,
    };
    await saveLiveTvMediaAsset(mediaAsset);

    // Send now playing to TV screen for 10 seconds (graceful fallback if TV broadcast is unconfigured)
    try {
      await sendNowPlaying({
        type: "image",
        title: "Foto Live",
        mediaUrl: storedMedia.mediaUrl,
        durationSeconds: 10,
        enabled: true,
        styleVariant: "default",
      });
    } catch (tvErr) {
      console.warn("[CustomerUpload] Avviso trasmissione TV opzionale:", tvErr);
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: "Foto inviata in diretta ed inserita nel carosello! Grazie, ciurma!",
    });
  } catch (error) {
    console.error("Live TV customer upload error:", error);
    return NextResponse.json(
      { error: "Errore durante l'invio del contenuto." },
      { status: 500 },
    );
  }
}
