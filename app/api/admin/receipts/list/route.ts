import { NextResponse } from "next/server";
import { getPendingReceiptRequests } from "@/lib/receipts/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // In a real app we should check the user session here.
    // For now we check against ADMIN_EMAILS via the admin check on the client.

    const requests = await getPendingReceiptRequests();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Admin list error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Errore interno durante il recupero." 
    }, { status: 500 });
  }
}
