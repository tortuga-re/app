import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { saveLiveTvMediaFile } from "@/lib/live-tv/media-storage";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxSize = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File) || !allowedTypes.has(image.type) || image.size <= 0 || image.size > maxSize) {
      return NextResponse.json({ error: "Carica un'immagine JPG, PNG, WebP o GIF non oltre 20 MB." }, { status: 400 });
    }
    // L'originale resta solo in memoria: viene salvata esclusivamente la versione WebP ottimizzata.
    const stored = await saveLiveTvMediaFile(image, "image", { optimizeImage: true });
    return NextResponse.json({ mediaUrl: stored.mediaUrl, sizeBytes: stored.sizeBytes });
  } catch {
    return NextResponse.json({ error: "Impossibile ottimizzare l'immagine." }, { status: 500 });
  }
}
