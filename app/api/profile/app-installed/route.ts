import { type NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/session/customer-session";
import { addTagsToContactByEmailOrCode } from "@/lib/cooperto/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessionIdentity = getCustomerSession(request);
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase() || sessionIdentity?.email;

    if (email) {
      void addTagsToContactByEmailOrCode({
        email,
        tags: ["APP-INSTALLATA"],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore registrazione installazione." },
      { status: 500 },
    );
  }
}
