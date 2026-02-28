import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/server/public-api-guard";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";

export const dynamic = "force-dynamic";

const PROGRAM_LOOKUP_ROUTE = "programs:lookup";
const PROGRAM_LOOKUP_RATE_LIMIT = {
  limit: 120,
  windowSeconds: 10 * 60,
};

const programLookupSchema = z.object({
  code: z.string().trim().min(3).max(50),
});

export async function GET(request: Request) {
  const requestContext = getRequestContext(request);

  try {
    const rateLimit = await checkRateLimit({
      request,
      route: PROGRAM_LOOKUP_ROUTE,
      limit: PROGRAM_LOOKUP_RATE_LIMIT.limit,
      windowSeconds: PROGRAM_LOOKUP_RATE_LIMIT.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many program lookups. Please retry shortly.",
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
    const parsed = programLookupSchema.safeParse({
      code: searchParams.get("code"),
    });

    if (!parsed.success) {
      await logActivitySafe({
        category: "public_program_lookup",
        action: "program_lookup_validation_failed",
        status: "failure",
        subjectType: "ProgramLookup",
        message: "Missing or invalid program code query parameter",
        ...requestContext,
      });
      return NextResponse.json(
        { success: false, error: "Missing or invalid program code" },
        { status: 400 },
      );
    }

    const code = parsed.data.code.toUpperCase();

    const program = await prisma.program.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        yearLabel: true,
        durationLabel: true,
        basePrice: true,
        currency: true,
        isActive: true,
      },
    });

    if (!program) {
      await logActivitySafe({
        category: "public_program_lookup",
        action: "program_lookup_not_found",
        status: "success",
        subjectType: "ProgramLookup",
        subjectLabel: code,
        message: "Program lookup completed with no match",
        ...requestContext,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Program ID is invalid. Please check and try again.",
        },
        { status: 404 },
      );
    }

    if (!program.isActive) {
      await logActivitySafe({
        category: "public_program_lookup",
        action: "program_lookup_inactive",
        status: "failure",
        subjectType: "Program",
        subjectId: program.id,
        subjectLabel: program.code,
        message: "Program lookup blocked for inactive program",
        ...requestContext,
      });
      return NextResponse.json(
        {
          success: false,
          error: "This program is currently inactive and not open for registration.",
        },
        { status: 400 },
      );
    }

    await logActivitySafe({
      category: "public_program_lookup",
      action: "program_lookup_succeeded",
      status: "success",
      subjectType: "Program",
      subjectId: program.id,
      subjectLabel: program.code,
      message: "Program lookup succeeded",
      ...requestContext,
      meta: {
        isActive: program.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        code: program.code,
        name: program.name,
        yearLabel: program.yearLabel,
        durationLabel: program.durationLabel,
        basePrice: Number(program.basePrice),
        currency: program.currency,
      },
    });
  } catch (error) {
    await logActivitySafe({
      category: "public_program_lookup",
      action: "program_lookup_internal_error",
      status: "failure",
      subjectType: "ProgramLookup",
      message: "Unhandled error during program lookup",
      ...requestContext,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    console.error("Program lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
