import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import {
  listLiveTvCustomerSubmissions,
  deleteLiveTvCustomerSubmission,
  saveLiveTvCustomerSubmission,
} from "@/lib/live-tv/customer-submissions";
import { isSubmissionInCurrentEvening } from "@/lib/live-tv/evening-window";
import { findLiveTvMediaFilePath } from "@/lib/live-tv/media-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const allSubmissions = await listLiveTvCustomerSubmissions();

    // Filter to photos uploaded within active evening window
    const activeEveningPhotos = allSubmissions.filter((sub) => {
      if (sub.kind !== "image") return false;
      return isSubmissionInCurrentEvening(sub.createdAt);
    });

    const availablePhotos = [];
    for (const p of activeEveningPhotos) {
      if (p.fileName) {
        const filePath = await findLiveTvMediaFilePath("image", p.fileName);
        if (!filePath) continue;
      }
      availablePhotos.push(p);
    }

    // Sort photos by likesCount DESCENDING (highest voted first)
    availablePhotos.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0));

    return NextResponse.json({
      success: true,
      photos: availablePhotos.map((p) => ({
        id: p.id,
        mediaUrl: p.mediaUrl,
        createdAt: p.createdAt,
        likesCount: p.likesCount ?? 0,
        likedByDevices: p.likedByDevices ?? [],
        uploaderName: p.uploaderName ?? "Ospite",
        originalName: p.originalName,
      })),
    });
  } catch (error) {
    console.error("Errore admin recupero foto:", error);
    return NextResponse.json({ error: "Impossibile recuperare le foto." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ error: "ID foto richiesto." }, { status: 400 });
    }

    await deleteLiveTvCustomerSubmission(photoId);
    return NextResponse.json({ success: true, message: "Foto eliminata con successo." });
  } catch (error) {
    console.error("Errore eliminazione foto:", error);
    return NextResponse.json({ error: "Errore durante l'eliminazione della foto." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    if (body.action === "resetLikes") {
      const allSubmissions = await listLiveTvCustomerSubmissions();
      for (const sub of allSubmissions) {
        if (sub.kind === "image") {
          await saveLiveTvCustomerSubmission({
            ...sub,
            likesCount: 0,
            likedByDevices: [],
          });
        }
      }
      return NextResponse.json({ success: true, message: "Voti foto azzerati." });
    }

    if (body.action === "delete" && body.photoId) {
      await deleteLiveTvCustomerSubmission(body.photoId);
      return NextResponse.json({ success: true, message: "Foto eliminata." });
    }

    return NextResponse.json({ error: "Azione non riconosciuta." }, { status: 400 });
  } catch (error) {
    console.error("Errore POST admin foto:", error);
    return NextResponse.json({ error: "Errore durante la gestione foto." }, { status: 500 });
  }
}
