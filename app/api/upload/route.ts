import { NextResponse } from "next/server";
import { fileUpload } from "@/lib/services/file-upload";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";

const ALLOWED_DIRECTORIES = ["documents", "receipts", "avatars"] as const;
type Directory = (typeof ALLOWED_DIRECTORIES)[number];
const ALLOWED_MIME_TYPES: Set<string> = new Set(ALLOWED_UPLOAD_MIME_TYPES);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const directory = (formData.get("directory") as string) || "documents";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (!ALLOWED_DIRECTORIES.includes(directory as Directory)) {
      return NextResponse.json(
        { success: false, error: "Invalid directory" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File exceeds ${MAX_UPLOAD_SIZE_MB}MB limit` },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await fileUpload.upload(
      buffer,
      file.name,
      file.type,
      directory,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
