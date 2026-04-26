import type { ProfileResponse } from "@/lib/cooperto/types";

export type PiratePhotoUploadResponse = {
  status: "success";
  message: string;
  fileName: string;
  contactCode?: string;
  profile?: ProfileResponse;
};
