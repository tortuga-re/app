import "server-only";

export const piratePhotoServerConfig = {
  uploadDir:
    process.env.PIRATE_PHOTO_UPLOAD_DIR?.trim() ||
    ".data/pirate-photos",
  notifyEmail:
    process.env.PIRATE_PHOTO_NOTIFY_EMAIL?.trim() ||
    "kinderland.re@gmail.com",
} as const;
