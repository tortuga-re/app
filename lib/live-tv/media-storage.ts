import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type LiveTvStoredMedia = {
  mediaUrl: string;
  fileName: string;
  storageMode: "external" | "public";
};

const EXTERNAL_MEDIA_DIR =
  process.env.LIVE_TV_MEDIA_EXTERNAL_DIR?.trim() ?? "";
const PUBLIC_MEDIA_BASE_URL =
  process.env.LIVE_TV_MEDIA_BASE_URL?.trim() ?? "/live-tv-media";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

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

export const saveLiveTvMediaFile = async (
  file: File,
  mediaKind: "image" | "video",
): Promise<LiveTvStoredMedia> => {
  const fileExt = getExtension(file);
  const safeBaseName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48);
  const fileName = `${Date.now()}-${safeBaseName || randomUUID()}.${fileExt}`;
  const config = getTargetConfig(mediaKind);
  const targetPath = path.join(config.targetDir, fileName);

  await mkdir(config.targetDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buffer);

  return {
    mediaUrl: `${config.publicBaseUrl}/${mediaKind}/${fileName}`,
    fileName,
    storageMode: config.storageMode,
  };
};
