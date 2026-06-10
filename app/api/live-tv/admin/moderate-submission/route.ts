import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import {
  getLiveTvCustomerSubmissionById,
  saveLiveTvCustomerSubmission,
} from "@/lib/live-tv/customer-submissions";
import { saveLiveTvMediaAsset } from "@/lib/live-tv/media-library";
import { addPlaylistItem, getLiveTvState } from "@/lib/live-tv/store";
import type { LiveTvCustomerSubmission, LiveTvMediaAsset } from "@/lib/live-tv/types";

const createAssetFromSubmission = (
  submission: LiveTvCustomerSubmission,
): LiveTvMediaAsset => ({
  id: crypto.randomUUID(),
  kind: submission.kind,
  title: submission.title,
  originalName: submission.originalName,
  fileName: submission.fileName,
  mediaUrl: submission.mediaUrl,
  mimeType: submission.mimeType,
  sizeBytes: submission.sizeBytes,
  storageMode: submission.storageMode,
  createdAt: new Date().toISOString(),
});

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | { id?: string; action?: string }
      | null;
    const submissionId = body?.id?.trim();
    const action = body?.action?.trim();

    if (!submissionId) {
      return NextResponse.json({ error: "ID contributo mancante." }, { status: 400 });
    }

    if (!action || !["library", "playlist", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Azione moderazione non valida." },
        { status: 400 },
      );
    }

    const submission = await getLiveTvCustomerSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { error: "Contributo non trovato." },
        { status: 404 },
      );
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Contributo gia moderato." },
        { status: 409 },
      );
    }

    const resolvedAt = new Date().toISOString();

    if (action === "reject") {
      await saveLiveTvCustomerSubmission({
        ...submission,
        status: "rejected",
        resolution: "rejected",
        resolvedAt,
      });

      return NextResponse.json({ success: true });
    }

    const asset = createAssetFromSubmission(submission);
    await saveLiveTvMediaAsset(asset);

    if (action === "playlist") {
      await addPlaylistItem({
        type: submission.kind,
        title: submission.title,
        mediaUrl: submission.mediaUrl,
        durationSeconds: submission.kind === "video" ? 18 : 12,
        enabled: true,
        styleVariant: "default",
      });
    }

    await saveLiveTvCustomerSubmission({
      ...submission,
      status: "approved",
      resolution: action === "playlist" ? "playlist" : "library",
      resolvedAt,
      linkedAssetId: asset.id,
    });

    return NextResponse.json({
      success: true,
      state: await getLiveTvState(),
    });
  } catch (error) {
    console.error("Live TV submission moderation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore moderazione contributo cliente.",
      },
      { status: 500 },
    );
  }
}
