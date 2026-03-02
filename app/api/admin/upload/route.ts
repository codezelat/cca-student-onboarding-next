import { NextResponse } from "next/server";
import { fileUpload } from "@/lib/services/file-upload";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";
import { getAdminIdentityStatus } from "@/lib/server/admin-auth";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";

const ALLOWED_DIRECTORIES = ["documents", "receipts", "avatars"] as const;
type Directory = (typeof ALLOWED_DIRECTORIES)[number];
const ALLOWED_MIME_TYPES = new Set<string>(ALLOWED_UPLOAD_MIME_TYPES);

export async function POST(request: Request) {
  const authStatus = getAdminIdentityStatus(request.headers);
  if (!authStatus.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: authStatus.message,
      },
      { status: authStatus.status },
    );
  }

  const requestContext = getRequestContext(request);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const directory = (formData.get("directory") as string) || "documents";

    if (!file || !(file instanceof File)) {
      await logActivitySafe({
        actor: { userId: authStatus.identity?.userId },
        category: "file_upload",
        action: "admin_upload_validation_failed",
        status: "failure",
        subjectType: "AdminUpload",
        message: "No file provided for admin upload",
        ...requestContext,
      });
      return NextResponse.json(
        { success: false, error: "No file provided." },
        { status: 400 },
      );
    }

    if (!ALLOWED_DIRECTORIES.includes(directory as Directory)) {
      await logActivitySafe({
        actor: { userId: authStatus.identity?.userId },
        category: "file_upload",
        action: "admin_upload_invalid_directory",
        status: "failure",
        subjectType: "AdminUpload",
        message: "Invalid upload directory in admin upload request",
        ...requestContext,
        meta: { directory },
      });
      return NextResponse.json(
        { success: false, error: "Invalid directory." },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      await logActivitySafe({
        actor: { userId: authStatus.identity?.userId },
        category: "file_upload",
        action: "admin_upload_file_too_large",
        status: "failure",
        subjectType: "AdminUpload",
        message: `Admin upload exceeded ${MAX_UPLOAD_SIZE_MB}MB limit`,
        ...requestContext,
        meta: {
          fileSize: file.size,
          contentType: file.type,
          directory,
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: `File exceeds ${MAX_UPLOAD_SIZE_MB}MB limit.`,
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      await logActivitySafe({
        actor: { userId: authStatus.identity?.userId },
        category: "file_upload",
        action: "admin_upload_unsupported_type",
        status: "failure",
        subjectType: "AdminUpload",
        message: "Admin upload rejected due to unsupported file type",
        ...requestContext,
        meta: {
          fileType: file.type,
          fileSize: file.size,
          directory,
        },
      });
      return NextResponse.json(
        { success: false, error: "Unsupported file type." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await fileUpload.upload(
      buffer,
      file.name,
      file.type,
      directory,
    );

    const uploadedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: {
        publicUrl: uploadResult.publicUrl,
        key: uploadResult.key,
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        uploadedAt,
      },
    });
  } catch (error) {
    await logActivitySafe({
      actor: { userId: authStatus.identity?.userId },
      category: "file_upload",
      action: "admin_upload_internal_error",
      status: "failure",
      subjectType: "AdminUpload",
      message: "Unhandled error during admin upload",
      ...requestContext,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { success: false, error: "Failed to upload file." },
      { status: 500 },
    );
  }
}
