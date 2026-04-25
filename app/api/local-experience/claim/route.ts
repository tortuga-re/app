import { NextResponse } from "next/server";

import { getProfileData, registerContactVisit } from "@/lib/cooperto/service";
import { localExperienceServerConfig } from "@/lib/local-experience/config";
import { isValidLocalExperienceToken } from "@/lib/local-experience/token";
import type {
  LocalExperienceClaimRequest,
  LocalExperienceClaimResponse,
} from "@/lib/local-experience/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
const isValidEmail = (value?: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const buildPromo = (): LocalExperienceClaimResponse["promo"] => ({
  title: localExperienceServerConfig.promo.title,
  benefit: localExperienceServerConfig.promo.benefit,
  instructions: localExperienceServerConfig.promo.instructions,
  microcopy: localExperienceServerConfig.promo.microcopy,
});

const json = (response: LocalExperienceClaimResponse) =>
  NextResponse.json(response);

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | Partial<LocalExperienceClaimRequest>
    | null;

  const token = payload?.token || payload?.source || "";

  if (!isValidLocalExperienceToken(token)) {
    return json({
      status: "invalid_token",
      promo: null,
    });
  }

  const email = normalizeEmail(payload?.email);

  if (!isValidEmail(email)) {
    return json({
      status: "not_identified",
      promo: null,
    });
  }

  try {
    const profile = await getProfileData("email", email);
    const contactCode = profile.contact?.CodiceContatto?.trim() ?? "";

    if (!profile.contact || !contactCode) {
      return json({
        status: "not_identified",
        promo: null,
      });
    }

    try {
      const visit = await registerContactVisit({
        contactCode,
        venueCode: localExperienceServerConfig.venueCode,
      });

      return json({
        status: "claimed",
        promo: buildPromo(),
        source: visit.source,
        visitDate: visit.visitDate,
      });
    } catch {
      return json({
        status: "cooperto_error",
        promo: buildPromo(),
      });
    }
  } catch {
    return json({
      status: "not_identified",
      promo: null,
    });
  }
}
