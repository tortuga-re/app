import "server-only";

import { localExperiencePublicConfig } from "@/lib/config";

export const localExperienceServerConfig = {
  token: process.env.LOCAL_EXPERIENCE_TOKEN?.trim() || "ac6cdf",
  venueCode: process.env.LOCAL_EXPERIENCE_SEDE_CODE?.trim() || "c729beba",
  qrSourceUrl: localExperiencePublicConfig.qrSourceUrl,
  promo: localExperiencePublicConfig.promo,
} as const;
