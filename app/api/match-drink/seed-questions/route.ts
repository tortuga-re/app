import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";

export async function POST(req: NextRequest) {
  const adminRequest = requireAdminRequest(req, "captain");
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  return NextResponse.json(
    {
      error: "Seed locale disabilitato: le domande Match & Drink sono gestite solo su Supabase.",
    },
    { status: 410 },
  );
}
