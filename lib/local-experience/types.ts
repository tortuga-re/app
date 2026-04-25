import type { DataSource } from "@/lib/cooperto/types";

export type LocalExperienceClaimStatus =
  | "claimed"
  | "already_registered"
  | "invalid_token"
  | "not_identified"
  | "cooperto_error";

export interface LocalExperienceClaimRequest {
  token?: string;
  source?: string;
  email?: string;
}

export interface LocalExperiencePromo {
  title: string;
  benefit: string;
  instructions: string;
  microcopy: string;
}

export interface LocalExperienceClaimResponse {
  status: LocalExperienceClaimStatus;
  promo: LocalExperiencePromo | null;
  source?: DataSource;
  visitDate?: string;
}
