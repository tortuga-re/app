export const piratePhotoPublicConfig = {
  maxUploadBytes: 5 * 1024 * 1024,
  monthPhotoAccept:
    "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif",
  avatarAccept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
  monthPhotoAllowedExtensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
  avatarAllowedExtensions: ["jpg", "jpeg", "png", "webp"],
} as const;
