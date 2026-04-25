import "server-only";

import { localExperienceServerConfig } from "@/lib/local-experience/config";

const cleanToken = (value?: string) => value?.trim().replace(/^\/+|\/+$/g, "") ?? "";

export const extractLocalExperienceToken = (value?: string) => {
  const rawValue = value?.trim() ?? "";

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue);
    const pathToken = url.pathname.split("/").filter(Boolean).at(-1);
    return cleanToken(pathToken || url.searchParams.get("token") || "");
  } catch {
    return cleanToken(rawValue);
  }
};

export const isValidLocalExperienceToken = (value?: string) =>
  extractLocalExperienceToken(value) === localExperienceServerConfig.token ||
  value?.trim() === localExperienceServerConfig.qrSourceUrl;
