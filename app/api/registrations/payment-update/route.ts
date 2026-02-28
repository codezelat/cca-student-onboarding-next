import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  beginIdempotency,
  checkRateLimit,
  createRequestHash,
  finalizeIdempotencyFailure,
  finalizeIdempotencySuccess,
} from "@/lib/server/public-api-guard";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";
import { z } from "zod";

export const dynamic = "force-dynamic";
const PAYMENT_UPDATE_ROUTE = "registrations:payment-update";
const PAYMENT_UPDATE_RATE_LIMIT = {
  limit: 15,
  windowSeconds: 10 * 60,
};

const paymentUpdateSchema = z.object({
  registrationId: z.string().trim().regex(/^\d+$/, "Invalid registration ID"),
  paymentUrl: z.string().trim().url().max(2048),
});

export async function POST(request: Request) {
  let activeIdempotencyKey: string | null = null;
  const requestContext = getRequestContext(request);

  try {
    const rateLimit = await checkRateLimit({
      request,
      route: PAYMENT_UPDATE_ROUTE,
      limit: PAYMENT_UPDATE_RATE_LIMIT.limit,
      windowSeconds: PAYMENT_UPDATE_RATE_LIMIT.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many payment update attempts. Please retry shortly.",
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

    const parsed = paymentUpdateSchema.safeParse({
      registrationId: String(formData.get("registration_id") || ""),
      paymentUrl: String(formData.get("payment_url") || ""),
    });

    if (!parsed.success) {
      await logActivitySafe({
        category: "payment_update",
        action: "payment_update_validation_failed",
        status: "failure",
        subjectType: "PaymentSlipUpdate",
        message: parsed.error.issues[0]?.message || "Missing required parameters",
        ...requestContext,
      });
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Missing required parameters",
        },
        { status: 400 },
      );
    }

    const { registrationId, paymentUrl } = parsed.data;
    const idempotencyState = await beginIdempotency({
      request,
      route: PAYMENT_UPDATE_ROUTE,
      idempotencyKey: request.headers.get("idempotency-key"),
      requestHash: createRequestHash({ registrationId, paymentUrl }),
      ttlSeconds: 24 * 60 * 60,
      inProgressTimeoutSeconds: 60,
    });

    if (idempotencyState.kind === "replay") {
      return NextResponse.json(idempotencyState.responseBody, {
        status: idempotencyState.httpStatus,
        headers: {
          "Idempotent-Replayed": "true",
        },
      });
    }

    if (idempotencyState.kind === "conflict") {
      return NextResponse.json(
        { success: false, error: idempotencyState.message },
        { status: 409 },
      );
    }

    if (idempotencyState.kind === "in_progress") {
      return NextResponse.json(
        { success: false, error: idempotencyState.message },
        { status: 409 },
      );
    }

    activeIdempotencyKey = idempotencyState.key;

    const registrationBigInt = BigInt(registrationId);

    const newSlip = {
      id: `slip_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      url: paymentUrl,
      uploadedAt: new Date().toISOString(),
      status: "pending",
    };
    const newSlipArray = JSON.stringify([newSlip]);

    type UpdatedRow = { id: bigint };
    const updatedRows = await prisma.$queryRaw<UpdatedRow[]>(Prisma.sql`
      UPDATE cca_registrations
      SET payment_slip = CASE
        WHEN payment_slip IS NULL THEN ${newSlipArray}::jsonb
        WHEN jsonb_typeof(payment_slip) = 'array' THEN payment_slip || ${newSlipArray}::jsonb
        ELSE jsonb_build_array(payment_slip) || ${newSlipArray}::jsonb
      END
      WHERE id = ${registrationBigInt}
      RETURNING id
    `);

    if (!updatedRows.length) {
      await logActivitySafe({
        category: "payment_update",
        action: "payment_update_registration_not_found",
        status: "failure",
        subjectType: "CCARegistration",
        subjectId: registrationId,
        message: "Registration not found",
        ...requestContext,
      });
      await finalizeIdempotencyFailure({
        key: activeIdempotencyKey!,
        httpStatus: 404,
        errorMessage: "Registration not found",
        ttlSeconds: 10 * 60,
      });
      return NextResponse.json(
        { success: false, error: "Registration not found" },
        { status: 404 },
      );
    }

    const responseBody = {
      success: true,
      message: "Payment slip updated successfully",
    };

    await finalizeIdempotencySuccess({
      key: activeIdempotencyKey!,
      httpStatus: 200,
      responseBody,
    });

    await logActivitySafe({
      category: "payment_update",
      action: "payment_slip_uploaded",
      status: "success",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      message: "Additional payment slip submitted by student",
      ...requestContext,
      meta: {
        slipId: newSlip.id,
      },
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    await logActivitySafe({
      category: "payment_update",
      action: "payment_update_internal_error",
      status: "failure",
      subjectType: "PaymentSlipUpdate",
      message: "Unhandled error while updating payment slip",
      ...requestContext,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    if (activeIdempotencyKey) {
      try {
        await finalizeIdempotencyFailure({
          key: activeIdempotencyKey,
          httpStatus: 500,
          errorMessage: "Internal server error",
        });
      } catch (idempotencyError) {
        console.error(
          "Payment update idempotency failure update error:",
          idempotencyError,
        );
      }
    }

    console.error("Payment update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
