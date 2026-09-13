import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { saveLiveTvMediaAsset } from "@/lib/live-tv/media-library";
import { saveLiveTvMediaFile } from "@/lib/live-tv/media-storage";

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
  "video/x-m4v",
  "video/m4v",
  "video/x-msvideo",
  "video/avi",
  "video/x-matroska",
  "video/3gpp",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "mov", "m4v", "avi", "mkv", "3gp"]);

const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024;

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
        { error: "File non valido o troppo pesante (max 250MB)." },
        { status: 400 },
      );
    }

    const normalizedType = (media.type || "").toLowerCase();
    const ext = (media.name.split(".").pop() || "").toLowerCase();

    let mediaKind: "image" | "video" | null = null;
    if (normalizedType.startsWith("image/") || ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      mediaKind = "image";
    } else if (normalizedType.startsWith("video/") || ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
      mediaKind = "video";
    }

    const isImageValid = mediaKind === "image" && (ALLOWED_IMAGE_TYPES.has(normalizedType) || ALLOWED_IMAGE_EXTENSIONS.has(ext));
    const isVideoValid = mediaKind === "video" && (ALLOWED_VIDEO_TYPES.has(normalizedType) || ALLOWED_VIDEO_EXTENSIONS.has(ext));

    if (!mediaKind || (!isImageValid && !isVideoValid)) {
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
      mimeType: storedMedia.mimeType,
      sizeBytes: storedMedia.sizeBytes,
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
