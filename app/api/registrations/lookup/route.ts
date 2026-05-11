import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/server/public-api-guard";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";
import { z } from "zod";

export const dynamic = "force-dynamic";
const LOOKUP_ROUTE = "registrations:lookup";
const LOOKUP_RATE_LIMIT = {
  limit: 60,
  windowSeconds: 10 * 60,
};

const lookupQuerySchema = z.object({
  type: z.enum(["local", "international"]),
  identifier: z.string().trim().min(3).max(50),
});

export async function GET(request: Request) {
  const requestContext = getRequestContext(request);
  try {
    const rateLimit = await checkRateLimit({
      request,
      route: LOOKUP_ROUTE,
      limit: LOOKUP_RATE_LIMIT.limit,
      windowSeconds: LOOKUP_RATE_LIMIT.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many lookup attempts. Please retry shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = lookupQuerySchema.safeParse({
      type: searchParams.get("type"),
      identifier: searchParams.get("identifier"),
    });

    if (!parsed.success) {
      await logActivitySafe({
        category: "public_lookup",
        action: "lookup_validation_failed",
        status: "failure",
        subjectType: "RegistrationLookup",
        message: "Missing or invalid lookup query parameters",
        ...requestContext,
      });
      return NextResponse.json(
        { success: false, error: "Missing or invalid query parameters" },
        { status: 400 },
      );
    }

    const { type, identifier } = parsed.data;
    const normalizedIdentifier = identifier.trim();

    const where =
      type === "local"
        ? {
            deletedAt: null,
            nicNumber: { equals: normalizedIdentifier, mode: "insensitive" as const },
          }
        : {
            deletedAt: null,
            passportNumber: {
              equals: normalizedIdentifier,
              mode: "insensitive" as const,
            },
          };

    const registrations = await prisma.cCARegistration.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        registerId: true,
        fullName: true,
        nameWithInitials: true,
        programId: true,
        programName: true,
        programYear: true,
        programDuration: true,
        fullAmount: true,
        currentPaidAmount: true,
      },
    });

    if (registrations.length === 0) {
      await logActivitySafe({
        category: "public_lookup",
        action: "lookup_not_found",
        status: "success",
        subjectType: "RegistrationLookup",
        subjectLabel: type,
        message: "Lookup completed with no matching student",
        ...requestContext,
      });
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    const paymentRegistrations = registrations.map((registration) => {
      const firstName = registration.fullName
        ? registration.fullName.split(" ")[0]
        : registration.nameWithInitials.split(" ").pop() || "Student";
      const fullAmount = registration.fullAmount
        ? Number(registration.fullAmount)
        : 0;
      const paidAmount = registration.currentPaidAmount
        ? Number(registration.currentPaidAmount)
        : 0;

      return {
        id: registration.id.toString(),
        registerId: registration.registerId,
        firstName,
        fullName: registration.fullName,
        programId: registration.programId,
        programName: registration.programName,
        programYear: registration.programYear,
        programDuration: registration.programDuration,
        fullAmount,
        paidAmount,
        balanceDue: fullAmount - paidAmount,
      };
    });

    await logActivitySafe({
      category: "public_lookup",
      action: "lookup_succeeded",
      status: "success",
      subjectType: "RegistrationLookup",
      subjectLabel: type,
      message: "Student payment lookup succeeded",
      ...requestContext,
      meta: {
        type,
        matchCount: paymentRegistrations.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: paymentRegistrations[0],
      registrations: paymentRegistrations,
      requiresSelection: paymentRegistrations.length > 1,
    });
  } catch (error) {
    await logActivitySafe({
      category: "public_lookup",
      action: "lookup_internal_error",
      status: "failure",
      subjectType: "RegistrationLookup",
      message: "Unhandled error during lookup",
      ...requestContext,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    console.error("Lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
