import { NextResponse } from "next/server";
import { loginOtpStore } from "@/lib/session/login-otp";
import { OtpError } from "@/lib/otp/store";
import { getProfileData } from "@/lib/cooperto/service";
import { measureServerOperation } from "@/lib/observability";
import {
  attachCustomerSessionCookie,
  normalizeCustomerSessionIdentity,
} from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { requestId?: string; code?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload non valido." },
      { status: 400 },
    );
  }

  if (!payload.requestId || !payload.code) {
    return NextResponse.json(
      { error: "Richiesta o codice mancanti." },
      { status: 400 },
    );
  }

  const requestId = payload.requestId;
  const code = payload.code;

  try {
    const record = await measureServerOperation(
      "login_otp_verify",
      async () => loginOtpStore.verify(requestId, code),
      { requestId },
    );
    const email = record.payload.email;

    if (!email) {
      return NextResponse.json(
        { error: "Email sessione non disponibile." },
        { status: 500 },
      );
    }

    const profileData = await measureServerOperation(
      "login_profile_lookup",
      async () => getProfileData("email", email),
      { email },
    );
    
    // Default values if profile not found in Cooperto, just to let them in with email
    const sessionIdentity = normalizeCustomerSessionIdentity({
      email,
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
      source: "login_otp"
    });

    return attachCustomerSessionCookie(response, sessionIdentity);
  } catch (error) {
    console.error("[Login OTP Verify Error]", error);
    return NextResponse.json(
      {
        error:
          error instanceof OtpError
            ? error.message
            : "Impossibile verificare l'accesso.",
      },
      { status: error instanceof OtpError ? error.status : 500 },
    );
  }
}

