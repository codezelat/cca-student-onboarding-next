import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/server/public-api-guard";
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
      return NextResponse.json(
        { success: false, error: "Missing or invalid query parameters" },
        { status: 400 },
      );
    }

    const { type, identifier } = parsed.data;

    const where =
      type === "local"
        ? { nicNumber: identifier }
        : { passportNumber: identifier };

    const registration = await prisma.cCARegistration.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        nameWithInitials: true,
        programName: true,
        fullAmount: true,
        currentPaidAmount: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    const firstName = registration.fullName
      ? registration.fullName.split(" ")[0]
      : registration.nameWithInitials.split(" ").pop() || "Student";

    const fullAmount = registration.fullAmount
      ? Number(registration.fullAmount)
      : 0;
    const paidAmount = registration.currentPaidAmount
      ? Number(registration.currentPaidAmount)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        id: registration.id.toString(),
        firstName,
        fullName: registration.fullName,
        programName: registration.programName,
        fullAmount,
        paidAmount,
        balanceDue: fullAmount - paidAmount,
      },
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
