import { NextResponse } from "next/server";
import { fileUpload } from "@/lib/services/file-upload";
import { z } from "zod";

const presignSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    directory: z
        .enum(["documents", "receipts", "avatars"])
        .default("documents"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate request body
        const result = presignSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { success: false, error: "Invalid request parameters" },
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
