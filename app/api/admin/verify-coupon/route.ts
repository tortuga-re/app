import { NextRequest, NextResponse } from "next/server";

import { verifyAndUseCoupon } from "@/lib/cooperto/coupon-verify";
import { requireAdminRequest } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      codiceCouponContatto?: string;
    } | null;

    const code = body?.codiceCouponContatto?.trim();

    if (!code) {
      return NextResponse.json(
        { error: "Codice coupon mancante." },
        { status: 400 },
      );
    }

    const result = await verifyAndUseCoupon(code);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Errore imprevisto.",
      },
      { status: 500 },
    );
  }
}
