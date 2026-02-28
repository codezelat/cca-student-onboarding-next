import { NextResponse } from "next/server";
import { fileUpload } from "@/lib/services/file-upload";
import { checkRateLimit } from "@/lib/server/public-api-guard";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";

const ALLOWED_DIRECTORIES = ["documents", "receipts", "avatars"] as const;
type Directory = (typeof ALLOWED_DIRECTORIES)[number];
const ALLOWED_MIME_TYPES: Set<string> = new Set(ALLOWED_UPLOAD_MIME_TYPES);
const UPLOAD_ROUTE = "upload:direct";
const UPLOAD_RATE_LIMIT = {
  limit: 40,
  windowSeconds: 10 * 60,
};

export async function POST(request: Request) {
  const requestContext = getRequestContext(request);
  try {
    const rateLimit = await checkRateLimit({
      request,
      route: UPLOAD_ROUTE,
      limit: UPLOAD_RATE_LIMIT.limit,
      windowSeconds: UPLOAD_RATE_LIMIT.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many upload attempts. Please retry shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const directory = (formData.get("directory") as string) || "documents";

    if (!file || !(file instanceof File)) {
      await logActivitySafe({
        category: "file_upload",
        action: "direct_upload_validation_failed",
        status: "failure",
        subjectType: "DirectUpload",
        message: "No file provided for direct upload",
        ...requestContext,
      });
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (!ALLOWED_DIRECTORIES.includes(directory as Directory)) {
      await logActivitySafe({
        category: "file_upload",
        action: "direct_upload_invalid_directory",
        status: "failure",
        subjectType: "DirectUpload",
        message: "Invalid upload directory",
        ...requestContext,
        meta: { directory },
      });
      return NextResponse.json(
        { success: false, error: "Invalid directory" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      await logActivitySafe({
        category: "file_upload",
        action: "direct_upload_file_too_large",
        status: "failure",
        subjectType: "DirectUpload",
        message: `File exceeds ${MAX_UPLOAD_SIZE_MB}MB limit`,
        ...requestContext,
        meta: {
          directory,
          fileSize: file.size,
          contentType: file.type,
        },
      });
      return NextResponse.json(
        { success: false, error: `File exceeds ${MAX_UPLOAD_SIZE_MB}MB limit` },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      await logActivitySafe({
        category: "file_upload",
        action: "direct_upload_unsupported_type",
        status: "failure",
        subjectType: "DirectUpload",
        message: "Unsupported file type",
        ...requestContext,
        meta: {
          directory,
          fileType: file.type,
          fileSize: file.size,
        },
      });
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

    await logActivitySafe({
      category: "file_upload",
      action: "direct_upload_succeeded",
      status: "success",
      subjectType: "DirectUpload",
      message: "File uploaded successfully",
      ...requestContext,
      meta: {
        directory,
        fileType: file.type,
        fileSize: file.size,
        key: result.key,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    await logActivitySafe({
      category: "file_upload",
      action: "direct_upload_internal_error",
      status: "failure",
      subjectType: "DirectUpload",
      message: "Failed to upload file",
      ...requestContext,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
