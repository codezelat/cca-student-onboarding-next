import { useState } from "react";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  ALLOWED_UPLOAD_LABEL,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  url: string | null;
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    url: null,
  });

  const uploadFile = async (
    file: File,
    directory: "documents" | "receipts" | "avatars" = "documents",
  ): Promise<string> => {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(`File exceeds ${MAX_UPLOAD_SIZE_MB}MB limit.`);
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      throw new Error(`Unsupported file type. Allowed: ${ALLOWED_UPLOAD_LABEL}.`);
    }

    setState({ isUploading: true, progress: 0, error: null, url: null });

    try {
      // Upload via server-side API route to avoid CORS issues with R2
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("directory", directory);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setState((prev) => ({ ...prev, progress }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              if (json.success && json.data?.publicUrl) {
                resolve(json.data.publicUrl);
              } else {
                reject(new Error(json.error || "Upload failed"));
              }
            } catch {
              reject(new Error("Invalid response from server"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      setState({
        isUploading: false,
        progress: 100,
        error: null,
        url: publicUrl,
      });
      return publicUrl;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to upload file";
      console.error("Upload error:", error);
      setState({
        isUploading: false,
        progress: 0,
        error: message,
        url: null,
      });
      throw error;
    }
  };

  return { ...state, uploadFile };
}
