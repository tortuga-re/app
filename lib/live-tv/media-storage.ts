import "server-only";

import { randomUUID } from "node:crypto";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const optimizeBufferWithSharp = async (sourceBuffer: Buffer, isGif: boolean) => {
  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default || sharpModule;
    return await sharp(sourceBuffer, {
      animated: isGif,
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: 1920,
        height: 1080,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toBuffer();
  } catch {
    return sourceBuffer;
  }
};

import type { LiveTvMediaAsset } from "@/lib/live-tv/types";

export type LiveTvStoredMedia = {
  mediaUrl: string;
  fileName: string;
  storageMode: "external" | "public";
  mimeType: string;
  sizeBytes: number;
};

type SaveLiveTvMediaOptions = {
  /** Converts a customer photo before it reaches persistent storage. */
  optimizeImage?: boolean;
};

const EXTERNAL_MEDIA_DIR =
  process.env.LIVE_TV_MEDIA_EXTERNAL_DIR?.trim() ?? "";
const PUBLIC_MEDIA_BASE_URL =
  process.env.LIVE_TV_MEDIA_BASE_URL?.trim() ?? "/live-tv-media";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const isSafeStoredFileName = (fileName: string) =>
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(fileName) &&
  !fileName.includes("..");

const getExtension = (file: File) => {
  const originalExt = file.name.split(".").pop()?.toLowerCase();
  if (originalExt) return originalExt;

  if (file.type.startsWith("image/")) return "jpg";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/ogg") return "ogv";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
};

const getTargetConfig = (mediaKind: "image" | "video") => {
  if (EXTERNAL_MEDIA_DIR) {
    return {
      storageMode: "external" as const,
      targetDir: path.join(EXTERNAL_MEDIA_DIR, mediaKind),
      publicBaseUrl: normalizeBaseUrl(PUBLIC_MEDIA_BASE_URL),
    };
  }

  return {
    storageMode: "public" as const,
    targetDir: path.join(process.cwd(), "public", "live-tv-media", mediaKind),
    publicBaseUrl: "/live-tv-media",
  };
};

const getTargetDir = (
  mediaKind: "image" | "video",
  storageMode: "external" | "public",
) => {
  if (storageMode === "external") {
    if (!EXTERNAL_MEDIA_DIR) {
      throw new Error("Storage esterno Live TV non configurato.");
    }

    return path.join(EXTERNAL_MEDIA_DIR, mediaKind);
  }

  return path.join(process.cwd(), "public", "live-tv-media", mediaKind);
};

const resolveTargetPath = (targetDir: string, fileName: string) => {
  if (!isSafeStoredFileName(fileName)) {
    return null;
  }

  const resolvedDir = path.resolve(targetDir);
  const resolvedPath = path.resolve(resolvedDir, fileName);

  if (
    resolvedPath !== resolvedDir &&
    !resolvedPath.startsWith(`${resolvedDir}${path.sep}`)
  ) {
    return null;
  }

  return resolvedPath;
};

export const saveLiveTvMediaFile = async (
  file: File,
  mediaKind: "image" | "video",
  options: SaveLiveTvMediaOptions = {},
): Promise<LiveTvStoredMedia> => {
  const safeBaseName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48);
  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const optimizeImage = mediaKind === "image" && options.optimizeImage;
  const fileExt = optimizeImage ? "webp" : getExtension(file);
  const fileName = `${Date.now()}-${safeBaseName || randomUUID()}.${fileExt}`;
  const config = getTargetConfig(mediaKind);
  const targetPath = path.join(config.targetDir, fileName);

  const buffer = optimizeImage
    ? await optimizeBufferWithSharp(sourceBuffer, file.type === "image/gif")
    : sourceBuffer;

  await mkdir(config.targetDir, { recursive: true });
  await writeFile(targetPath, buffer);

  return {
    mediaUrl: `${config.publicBaseUrl}/${mediaKind}/${fileName}`,
    fileName,
    storageMode: config.storageMode,
    mimeType: optimizeImage ? "image/webp" : file.type,
    sizeBytes: buffer.byteLength,
  };
};

export const deleteLiveTvMediaFile = async (
  asset: Pick<LiveTvMediaAsset, "kind" | "fileName" | "storageMode">,
) => {
  const targetDir = getTargetDir(asset.kind, asset.storageMode);
  const targetPath = path.join(targetDir, asset.fileName);

  await rm(targetPath, { force: true });
};

export const findLiveTvMediaFilePath = async (
  mediaKind: "image" | "video",
  fileName: string,
) => {
  const targetDirs = [
    EXTERNAL_MEDIA_DIR ? path.join(EXTERNAL_MEDIA_DIR, mediaKind) : null,
    path.join(process.cwd(), "public", "live-tv-media", mediaKind),
  ].filter((value): value is string => Boolean(value));

  for (const targetDir of targetDirs) {
    const candidatePath = resolveTargetPath(targetDir, fileName);

    if (!candidatePath) {
      return null;
    }

    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      // Try the next configured storage location.
    }
  }

  return null;
};
