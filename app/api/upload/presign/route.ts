import { NextResponse } from "next/server";
import { fileUpload } from "@/lib/services/file-upload";
import { checkRateLimit } from "@/lib/server/public-api-guard";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";
import { z } from "zod";
import {
    ALLOWED_UPLOAD_MIME_TYPES,
    MAX_UPLOAD_SIZE_BYTES,
    MAX_UPLOAD_SIZE_MB,
} from "@/lib/upload-config";
const PRESIGN_ROUTE = "upload:presign";
const PRESIGN_RATE_LIMIT = {
    limit: 60,
    windowSeconds: 10 * 60,
};

const presignSchema = z.object({
    filename: z.string().min(1),
    contentType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
    fileSize: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
    directory: z
        .enum(["documents", "receipts", "avatars"])
        .default("documents"),
});

export async function POST(request: Request) {
    const requestContext = getRequestContext(request);
    try {
        const rateLimit = await checkRateLimit({
            request,
            route: PRESIGN_ROUTE,
            limit: PRESIGN_RATE_LIMIT.limit,
            windowSeconds: PRESIGN_RATE_LIMIT.windowSeconds,
        });

        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Too many upload requests. Please retry shortly.",
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(rateLimit.retryAfterSeconds),
                    },
                },
            );
        }

        const body = await request.json();

        // Validate request body
        const result = presignSchema.safeParse(body);
        if (!result.success) {
            await logActivitySafe({
                category: "file_upload",
                action: "presign_validation_failed",
                status: "failure",
                subjectType: "UploadPresign",
                message: "Invalid request parameters for upload presign",
                ...requestContext,
            });
            return NextResponse.json(
                { success: false, error: "Invalid request parameters" },
                { status: 400 },
            );
        }

        if (result.data.fileSize > MAX_UPLOAD_SIZE_BYTES) {
            await logActivitySafe({
                category: "file_upload",
                action: "presign_file_too_large",
                status: "failure",
                subjectType: "UploadPresign",
                message: `Upload exceeds ${MAX_UPLOAD_SIZE_MB}MB limit`,
                ...requestContext,
                meta: {
                    directory: result.data.directory,
                    fileSize: result.data.fileSize,
                    contentType: result.data.contentType,
                },
            });
            return NextResponse.json(
                {
                    success: false,
                    error: `File exceeds ${MAX_UPLOAD_SIZE_MB}MB limit`,
                },
                { status: 400 },
            );
        }

        // Generate presigned URL
        const uploadData = await fileUpload.getPresignedUrl(
            result.data.filename,
            result.data.contentType,
            result.data.directory,
        );

        await logActivitySafe({
            category: "file_upload",
            action: "presign_generated",
            status: "success",
            subjectType: "UploadPresign",
            message: "Presigned upload URL generated",
            ...requestContext,
            meta: {
                directory: result.data.directory,
                contentType: result.data.contentType,
                fileSize: result.data.fileSize,
                key: uploadData.key,
            },
        });

        return NextResponse.json({
            success: true,
            data: uploadData,
        });
    } catch (error) {
        await logActivitySafe({
            category: "file_upload",
            action: "presign_internal_error",
            status: "failure",
            subjectType: "UploadPresign",
            message: "Failed to generate presigned upload URL",
            ...requestContext,
            meta: {
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        console.error("Presign URL Generation Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate upload URL" },
            { status: 500 },
        );
    }
}
