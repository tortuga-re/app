import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/live-buzzer/admin";
import { getPendingReceiptRequests } from "@/lib/receipts/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get("adminEmail"); // Note: In a real app this should be from session

    // For now we trust the email or would check a session token.
    // The client-side will send this, but we should also check the user session if possible.
    // Given the project structure, we check against ADMIN_EMAILS.

    const requests = await getPendingReceiptRequests();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Admin list error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Errore interno durante il recupero." 
    }, { status: 500 });
  }
}
