import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { saveLiveTvMediaAsset } from "@/lib/live-tv/media-library";
import { saveLiveTvMediaFile } from "@/lib/live-tv/media-storage";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const MAX_FILE_SIZE_BYTES = 80 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const adminRequest = requireAdminRequest(req);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const formData = await req.formData();
    const media = formData.get("media");

    if (!(media instanceof File)) {
      return NextResponse.json({ error: "File media mancante." }, { status: 400 });
    }

    if (media.size <= 0 || media.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File non valido o troppo pesante." },
        { status: 400 },
      );
    }

    const mediaKind = media.type.startsWith("image/")
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
        { error: "Formato file non supportato per la Live TV." },
        { status: 400 },
      );
    }

    const storedMedia = await saveLiveTvMediaFile(media, mediaKind);
    const asset = {
      id: crypto.randomUUID(),
      kind: mediaKind,
      title: media.name.replace(/\.[^.]+$/, ""),
      originalName: media.name,
      fileName: storedMedia.fileName,
      mediaUrl: storedMedia.mediaUrl,
      mimeType: media.type,
      sizeBytes: media.size,
      storageMode: storedMedia.storageMode,
      createdAt: new Date().toISOString(),
    } as const;
    await saveLiveTvMediaAsset(asset);

    return NextResponse.json({
      success: true,
      mediaUrl: asset.mediaUrl,
      mediaKind,
      fileName: asset.fileName,
      asset,
    });
  } catch (error) {
    console.error("Live TV media upload error:", error);
    return NextResponse.json(
      { error: "Errore durante il caricamento del file Live TV." },
      { status: 500 },
    );
  }
}
