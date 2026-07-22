import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";
import { checkRateLimit } from "@/lib/server/public-api-guard";

export const dynamic = "force-dynamic";

const CERTIFICATE_VERIFY_ROUTE = "certificates:verify";
const CERTIFICATE_VERIFY_RATE_LIMIT = {
  limit: 30,
  windowSeconds: 10 * 60,
};
const CERTIFICATE_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,79}$/;

const certificateVerificationQuerySchema = z.object({
  certificateId: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .refine((value) => CERTIFICATE_NUMBER_PATTERN.test(value)),
});

function json(
  body: Record<string, unknown>,
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(request: Request) {
  const requestContext = getRequestContext(request);

  try {
    const rateLimit = await checkRateLimit({
      request,
      route: CERTIFICATE_VERIFY_ROUTE,
      limit: CERTIFICATE_VERIFY_RATE_LIMIT.limit,
      windowSeconds: CERTIFICATE_VERIFY_RATE_LIMIT.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return json(
        {
          success: false,
          error: "Too many verification attempts. Please retry shortly.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = certificateVerificationQuerySchema.safeParse({
      certificateId: searchParams.get("certificate_id"),
    });

    if (!parsed.success) {
      await logActivitySafe({
        category: "public_certificate_verification",
        action: "certificate_verification_validation_failed",
        status: "failure",
        subjectType: "CertificateVerification",
        message: "Missing or invalid certificate verification query",
        ...requestContext,
      });
      return json(
        { success: false, error: "Enter a valid certificate ID." },
        { status: 400 },
      );
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        certificateNumber: parsed.data.certificateId,
        registration: { deletedAt: null },
      },
      select: {
        id: true,
        certificateNumber: true,
        result: true,
        issuedAt: true,
        programCodeSnapshot: true,
        programNameSnapshot: true,
        programYearSnapshot: true,
        registration: { select: { fullName: true } },
        moduleResults: {
          select: {
            result: true,
            moduleCodeSnapshot: true,
            moduleNameSnapshot: true,
            creditValueSnapshot: true,
          },
          orderBy: { moduleCodeSnapshot: "asc" },
        },
      },
    });

    if (!certificate) {
      await logActivitySafe({
        category: "public_certificate_verification",
        action: "certificate_verification_not_found",
        status: "success",
        subjectType: "CertificateVerification",
        message: "Certificate verification completed with no match",
        ...requestContext,
      });
      return json(
        { success: false, error: "Certificate could not be verified." },
        { status: 404 },
      );
    }

    await logActivitySafe({
      category: "public_certificate_verification",
      action: "certificate_verification_succeeded",
      status: "success",
      subjectType: "Certificate",
      subjectId: certificate.id,
      message: "Public certificate verification succeeded",
      ...requestContext,
      meta: { moduleResultCount: certificate.moduleResults.length },
    });

    return json({
      success: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.registration.fullName,
        result: certificate.result,
        issuedAt: certificate.issuedAt.toISOString(),
        program: {
          code: certificate.programCodeSnapshot,
          name: certificate.programNameSnapshot,
          year: certificate.programYearSnapshot,
        },
        moduleResults: certificate.moduleResults.map((moduleResult) => ({
          code: moduleResult.moduleCodeSnapshot,
          name: moduleResult.moduleNameSnapshot,
          credits:
            moduleResult.creditValueSnapshot === null
              ? null
              : String(moduleResult.creditValueSnapshot),
          result: moduleResult.result,
        })),
      },
    });
  } catch (error) {
    await logActivitySafe({
      category: "public_certificate_verification",
      action: "certificate_verification_internal_error",
      status: "failure",
      subjectType: "CertificateVerification",
      message: "Unhandled error during certificate verification",
      ...requestContext,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    console.error("Certificate verification error:", error);
    return json(
      { success: false, error: "Unable to verify the certificate right now." },
      { status: 500 },
    );
  }
}
