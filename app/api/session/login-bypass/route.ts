import { NextResponse } from "next/server";
import { getProfileData } from "@/lib/cooperto/service";
import {
  attachCustomerSessionCookie,
  normalizeCustomerSessionIdentity,
} from "@/lib/session/customer-session";
import { normalizeCustomerEmail, isValidCustomerEmail } from "@/lib/customer-identity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { email?: string; pin?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload non valido." },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeCustomerEmail(payload.email);
  const pin = payload.pin?.trim();

  if (!isValidCustomerEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Email non valida." },
      { status: 400 },
    );
  }

  if (!pin) {
    return NextResponse.json(
      { error: "PIN mancante." },
      { status: 400 },
    );
  }

  const adminPin = process.env.ADMIN_IMPERSONATE_PIN;
  if (!adminPin || pin !== adminPin) {
    // We can simulate an error here to prevent brute forcing
    return NextResponse.json(
      { error: "PIN Capitano non valido." },
      { status: 401 },
    );
  }

  try {
    const profileData = await getProfileData("email", normalizedEmail);
    
    // Default values if profile not found in Cooperto
    const sessionIdentity = normalizeCustomerSessionIdentity({
      email: normalizedEmail,
      firstName: profileData.contact?.Nome || "",
      lastName: profileData.contact?.Cognome || "",
      phone: profileData.contact?.Telefono || "",
      marketingConsent:
        typeof profileData.contact?.ConsensoMarketing === "number"
          ? profileData.contact.ConsensoMarketing === 1
          : undefined,
    });

    if (!sessionIdentity) {
       return NextResponse.json({ error: "Errore durante la creazione della sessione." }, { status: 500 });
    }

    const response = NextResponse.json({
      ...profileData,
      source: "login_bypass"
    });

    return attachCustomerSessionCookie(response, sessionIdentity);
  } catch (error) {
    console.error("[Login Bypass Error]", error);
    return NextResponse.json(
      { error: "Impossibile forzare l'accesso." },
      { status: 500 },
    );
  }
}

