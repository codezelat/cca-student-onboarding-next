import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paymentUpdateSchema = z.object({
  registrationId: z.string().trim().regex(/^\d+$/, "Invalid registration ID"),
  paymentUrl: z.string().trim().url().max(2048),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const parsed = paymentUpdateSchema.safeParse({
      registrationId: String(formData.get("registration_id") || ""),
      paymentUrl: String(formData.get("payment_url") || ""),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Missing required parameters",
        },
        { status: 400 },
      );
    }

    const { registrationId, paymentUrl } = parsed.data;
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
      return NextResponse.json(
        { success: false, error: "Registration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment slip updated successfully",
    });
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
