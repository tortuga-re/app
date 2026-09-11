import { NextResponse } from "next/server";
import { loginOtpStore, sendLoginOtpEmail, shouldBypassLoginOtp } from "@/lib/session/login-otp";
import { measureServerOperation } from "@/lib/observability";
import { normalizeProfileEmail as normalizeCustomerEmail, isValidProfileEmail as isValidCustomerEmail } from "@/lib/profile/validation";
import { OtpError } from "@/lib/otp/store";
import { getProfileData } from "@/lib/cooperto/service";
import {
  attachCustomerSessionCookie,
  normalizeCustomerSessionIdentity,
} from "@/lib/session/customer-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { email?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload non valido." },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeCustomerEmail(payload.email);

  if (!isValidCustomerEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Email non valida." },
      { status: 400 },
    );
  }

  try {
    if (shouldBypassLoginOtp(normalizedEmail)) {
      const profileData = await measureServerOperation(
        "login_profile_lookup",
        async () => getProfileData("email", normalizedEmail),
        { email: normalizedEmail, otpBypass: true },
      );
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
        return NextResponse.json(
          { error: "Errore durante la creazione della sessione." },
          { status: 500 },
        );
      }

      return attachCustomerSessionCookie(
        NextResponse.json({
          authenticated: true,
          profile: { ...profileData, source: "login_otp_bypass" },
        }),
        sessionIdentity,
      );
    }

    const { record, code } = await measureServerOperation(
      "login_otp_request",
      async () => loginOtpStore.create({
        email: normalizedEmail,
      }),
      { email: normalizedEmail },
    );

    await measureServerOperation(
      "login_otp_email_send",
      async () => sendLoginOtpEmail(normalizedEmail, code),
      { email: normalizedEmail },
    );

    return NextResponse.json({
      requestId: record.requestId,
      email: normalizedEmail,
      expiresAt: new Date(record.expiresAt).toISOString(),
      resendAvailableAt: new Date(record.resendAvailableAt).toISOString(),
      attemptsRemaining: Math.max(loginOtpStore.maxOtpAttempts - record.attempts, 0),
    });
  } catch (error) {
    console.error("[Login OTP Request Error]", error);
    return NextResponse.json(
      {
        error:
          error instanceof OtpError
            ? error.message
            : "Impossibile elaborare la richiesta di accesso.",
      },
      { status: error instanceof OtpError ? error.status : 500 },
    );
  }
}
