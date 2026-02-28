import { NextResponse } from "next/server";
import { fileUpload } from "@/lib/services/file-upload";
import { checkRateLimit } from "@/lib/server/public-api-guard";
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
            return NextResponse.json(
                { success: false, error: "Invalid request parameters" },
                { status: 400 },
            );
        }

        if (result.data.fileSize > MAX_UPLOAD_SIZE_BYTES) {
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

        return NextResponse.json({
            success: true,
            data: uploadData,
        });
    } catch (error) {
        console.error("Presign URL Generation Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate upload URL" },
            { status: 500 },
        );
    }
}
