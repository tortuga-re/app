import { type NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getPendingReceiptRequests } from "@/lib/receipts/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const unauthorizedResponse = requireAdminRequest(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const requests = await getPendingReceiptRequests();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Admin list error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Errore interno durante il recupero." 
    }, { status: 500 });
  }
}
