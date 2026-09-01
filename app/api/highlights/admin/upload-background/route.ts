import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { saveHighlightBackgroundAsset } from "@/lib/highlights/background-library";
import { saveLiveTvMediaFile } from "@/lib/live-tv/media-storage";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Immagine mancante." }, { status: 400 });
    }
    if (image.size <= 0 || image.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Immagine non valida o superiore a 20 MB." },
        { status: 400 },
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return NextResponse.json(
        { error: "Sono supportati JPG, PNG, WebP e GIF." },
        { status: 400 },
      );
    }

    // Writes only the optimized WebP output; the source file is never persisted.
    const stored = await saveLiveTvMediaFile(image, "image", {
      optimizeImage: true,
    });
    const asset = {
      id: crypto.randomUUID(),
      title: image.name.replace(/\.[^.]+$/, ""),
      mediaUrl: stored.mediaUrl,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      createdAt: new Date().toISOString(),
    };
    await saveHighlightBackgroundAsset(asset);

    return NextResponse.json({ success: true, asset, mediaUrl: asset.mediaUrl });
  } catch (error) {
    console.error("Highlight background upload error:", error);
    return NextResponse.json(
      { error: "Errore durante l'ottimizzazione dell'immagine." },
      { status: 500 },
    );
  }
}
