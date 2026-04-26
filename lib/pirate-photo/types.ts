import type { ProfileResponse } from "@/lib/cooperto/types";

export type PiratePhotoUploadResponse = {
  status: "success";
  message: string;
  notificationStatus: "sent" | "failed";
  notificationMessage?: string;
  fileName: string;
  contactCode?: string;
  profile?: ProfileResponse;
};
