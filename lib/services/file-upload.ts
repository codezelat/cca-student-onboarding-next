import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// Simple slugify function to replace the external library
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export class FileUploadService {
    private client: S3Client;
    private bucket: string;
    private publicUrl: string;

    constructor() {
        this.client = new S3Client({
            region: process.env.R2_REGION || "auto",
            endpoint: process.env.R2_ENDPOINT!,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID!,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
            },
        });
        this.bucket = process.env.R2_BUCKET!;
        this.publicUrl = process.env.R2_PUBLIC_URL!;
    }

    /**
     * Generate presigned URL for upload
     */
    async getPresignedUrl(
        filename: string,
        contentType: string,
        directory: string,
    ): Promise<{ url: string; key: string; publicUrl: string }> {
        const ext = filename.split(".").pop();
        const baseName =
            filename.substring(0, filename.lastIndexOf(".")) || filename;
        const base = slugify(baseName.substring(0, 50));
        const key = `${directory}/${base}_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(this.client, command, {
            expiresIn: 300,
        });

        return {
            url,
            key,
            publicUrl: `${this.publicUrl}/${key}`,
        };
    }

    /**
     * Delete file from storage
     */
    async delete(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
    }

    /**
     * Delete multiple files
     */
    async deleteMany(keys: string[]): Promise<void> {
        await Promise.all(keys.map((k) => this.delete(k)));
    }
}

export const fileUpload = new FileUploadService();
