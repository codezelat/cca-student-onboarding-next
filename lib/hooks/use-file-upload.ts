import { useState } from "react";

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
        setState({ isUploading: true, progress: 0, error: null, url: null });

        try {
            // 1. Get presigned URL
            const presignRes = await fetch("/api/upload/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    directory,
                }),
            });

            if (!presignRes.ok) {
                throw new Error("Failed to get upload URL");
            }

            const { data } = await presignRes.json();
            const { url, publicUrl } = data;

            // 2. Upload file directly to S3/R2
            // Note: Using XMLHttpRequest instead of fetch to track upload progress
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round(
                            (event.loaded / event.total) * 100,
                        );
                        setState((prev) => ({ ...prev, progress }));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error("Upload failed"));
                    }
                };

                xhr.onerror = () =>
                    reject(new Error("Network error during upload"));

                xhr.open("PUT", url);
                xhr.setRequestHeader("Content-Type", file.type);
                xhr.send(file);
            });

            setState({
                isUploading: false,
                progress: 100,
                error: null,
                url: publicUrl,
            });
            return publicUrl;
        } catch (error: any) {
            console.error("Upload error:", error);
            setState({
                isUploading: false,
                progress: 0,
                error: error.message || "Failed to upload file",
                url: null,
            });
            throw error;
        }
    };

    return { ...state, uploadFile };
}
