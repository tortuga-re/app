import { NextRequest, NextResponse } from "next/server";
import { listLiveTvCustomerSubmissions, saveLiveTvCustomerSubmission } from "@/lib/live-tv/customer-submissions";
import { isSubmissionInCurrentEvening } from "@/lib/live-tv/evening-window";
import { findLiveTvMediaFilePath } from "@/lib/live-tv/media-storage";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const allSubmissions = await listLiveTvCustomerSubmissions();

    // Filter to photos uploaded within the active evening window (12:00 PM to 02:00 AM next day)
    const activeEveningPhotos = allSubmissions.filter((sub) => {
      if (sub.kind !== "image") return false;
      return isSubmissionInCurrentEvening(sub.createdAt);
    });

    // Verify media files actually exist on disk/storage
    const availablePhotos = [];
    for (const p of activeEveningPhotos) {
      if (p.fileName) {
        const filePath = await findLiveTvMediaFilePath("image", p.fileName);
        if (!filePath) {
          // Media file is missing or removed from server storage
          continue;
        }
      }
      availablePhotos.push(p);
    }

    return NextResponse.json(
      {
        success: true,
        photos: availablePhotos.map((p) => ({
          id: p.id,
          mediaUrl: p.mediaUrl,
          createdAt: p.createdAt,
          likesCount: p.likesCount ?? 0,
          likedByDevices: p.likedByDevices ?? [],
        })),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Errore recupero foto della serata:", error);
    return NextResponse.json({ error: "Impossibile recuperare le foto della serata." }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoId, deviceId } = body;

    if (!photoId || !deviceId) {
      return NextResponse.json({ error: "Identificativo foto e dispositivo richiesti." }, { status: 400, headers: corsHeaders });
    }

    const allSubmissions = await listLiveTvCustomerSubmissions();
    const photo = allSubmissions.find((s) => s.id === photoId);

    if (!photo) {
      return NextResponse.json({ error: "Foto non trovata." }, { status: 404, headers: corsHeaders });
    }

    const currentLikedDevices = photo.likedByDevices ?? [];
    const isAlreadyLiked = currentLikedDevices.includes(deviceId);

    let updatedDevices = currentLikedDevices;
    if (!isAlreadyLiked) {
      updatedDevices = [...currentLikedDevices, deviceId];
    }

    const updatedPhoto = {
      ...photo,
      likedByDevices: updatedDevices,
      likesCount: updatedDevices.length,
    };

    await saveLiveTvCustomerSubmission(updatedPhoto);

    return NextResponse.json(
      {
        success: true,
        likesCount: updatedPhoto.likesCount,
        liked: true,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Errore aggiunta like foto:", error);
    return NextResponse.json({ error: "Errore durante il salvataggio del like." }, { status: 500, headers: corsHeaders });
  }
}
