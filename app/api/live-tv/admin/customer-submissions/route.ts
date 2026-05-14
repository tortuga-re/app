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
    return NextResponse.json({
      submissions: await listLiveTvCustomerSubmissions(),
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
