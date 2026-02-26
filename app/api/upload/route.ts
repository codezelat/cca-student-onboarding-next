import { NextResponse } from "next/server";
import { fileUpload } from "@/lib/services/file-upload";

const ALLOWED_DIRECTORIES = ["documents", "receipts", "avatars"] as const;
type Directory = (typeof ALLOWED_DIRECTORIES)[number];

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
