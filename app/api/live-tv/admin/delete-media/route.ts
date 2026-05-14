import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import {
  getLiveTvMediaAssetById,
  removeLiveTvMediaAsset,
} from "@/lib/live-tv/media-library";
import { deleteLiveTvMediaFile } from "@/lib/live-tv/media-storage";

export async function POST(req: NextRequest) {
  const adminRequest = requireAdminRequest(req);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    const assetId = body?.id?.trim();

    if (!assetId) {
      return NextResponse.json(
        { error: "ID file mancante per la cancellazione." },
        { status: 400 },
      );
    }

    const asset = await getLiveTvMediaAssetById(assetId);
    if (!asset) {
      return NextResponse.json(
        { error: "File non trovato nella libreria media." },
        { status: 404 },
      );
    }

    await deleteLiveTvMediaFile(asset);
    await removeLiveTvMediaAsset(assetId);

    return NextResponse.json({
      success: true,
      deletedAssetId: assetId,
    });
  } catch (error) {
    console.error("Live TV media delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la cancellazione del file Live TV.",
      },
      { status: 500 },
    );
  }
}
