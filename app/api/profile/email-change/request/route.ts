import { NextResponse } from "next/server";

import { hasCoopertoLiveConfig } from "@/lib/config";
import { getProfileData } from "@/lib/cooperto/service";
import {
  createEmailChangeRequest,
  EmailChangeError,
} from "@/lib/profile-email-change/store";
import type { EmailChangeRequestPayload } from "@/lib/profile-email-change/types";
import {
  isValidProfileEmail,
  normalizeProfileEmail,
  normalizeProfileUpdateInput,
  validateProfileUpdateInput,
} from "@/lib/profile/validation";

export const dynamic = "force-dynamic";

const jsonError = (error: unknown, fallback: string, fallbackStatus = 500) => {
  if (error instanceof EmailChangeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallback,
    },
    { status: fallbackStatus },
  );
};

export async function POST(request: Request) {
  let body: Partial<EmailChangeRequestPayload>;

  try {
    body = (await request.json()) as Partial<EmailChangeRequestPayload>;
  } catch {
    return NextResponse.json(
      { error: "Payload verifica email non valido." },
      { status: 400 },
    );
  }

  const currentEmail = normalizeProfileEmail(body.currentEmail);
  const profile = normalizeProfileUpdateInput(body.profile);
  const validationError = validateProfileUpdateInput(profile);

  if (!currentEmail || !isValidProfileEmail(currentEmail)) {
    return NextResponse.json(
      { error: "Email attuale non valida." },
      { status: 400 },
    );
  }

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (currentEmail === profile.email) {
    return NextResponse.json(
      { error: "La nuova email coincide con quella attuale." },
      { status: 400 },
    );
  }

  if (hasCoopertoLiveConfig) {
    const currentProfile = await getProfileData("email", currentEmail);
    const coopertoEmail = normalizeProfileEmail(currentProfile.contact?.Email);

    if (!currentProfile.contact || coopertoEmail !== currentEmail) {
      return NextResponse.json(
        { error: "Profilo attuale non trovato." },
        { status: 404 },
      );
    }
  }

  try {
    const response = await createEmailChangeRequest({
      currentEmail,
      profile,
    });

    return NextResponse.json(response);
  } catch (error) {
    return jsonError(
      error,
      "Non sono riuscito a inviare il codice di verifica.",
    );
  }
}
