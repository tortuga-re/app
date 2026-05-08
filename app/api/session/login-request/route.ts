import { NextResponse } from "next/server";
import { loginOtpStore, sendLoginOtpEmail } from "@/lib/session/login-otp";
import { normalizeCustomerEmail, isValidCustomerEmail } from "@/lib/customer-identity";
import { OtpError } from "@/lib/otp/store";

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
    const { record, code } = await loginOtpStore.create({
      email: normalizedEmail,
    });

    await sendLoginOtpEmail(normalizedEmail, code);

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
