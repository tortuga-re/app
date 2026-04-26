import type { ProfileUpdateInput } from "@/lib/cooperto/types";

export type EmailChangeRequestPayload = {
  currentEmail: string;
  profile: ProfileUpdateInput;
};

export type EmailChangeRequestResponse = {
  requestId: string;
  pendingEmail: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
};

export type EmailChangeVerifyPayload = {
  requestId: string;
  code: string;
};

export type EmailChangeResendPayload = {
  requestId: string;
};
