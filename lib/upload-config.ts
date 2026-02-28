export const MAX_UPLOAD_SIZE_MB = 5;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
] as const;

export const ALLOWED_UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const ALLOWED_UPLOAD_LABEL = "PDF, JPG, JPEG, PNG";
