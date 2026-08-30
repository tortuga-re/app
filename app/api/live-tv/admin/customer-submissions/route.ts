import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { listLiveTvCustomerSubmissions } from "@/lib/live-tv/customer-submissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const submissions = await listLiveTvCustomerSubmissions();
    return NextResponse.json({
      submissions: submissions.map((submission) => ({
        id: submission.id,
        kind: submission.kind,
        title: submission.title,
        originalName: submission.originalName,
        fileName: submission.fileName,
        mediaUrl: submission.mediaUrl,
        mimeType: submission.mimeType,
        sizeBytes: submission.sizeBytes,
        storageMode: submission.storageMode,
        createdAt: submission.createdAt,
        status: submission.status,
        resolvedAt: submission.resolvedAt,
        resolution: submission.resolution,
        linkedAssetId: submission.linkedAssetId,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Coda contributi clienti non disponibile.",
      },
      { status: 500 },
    );
  }
}
