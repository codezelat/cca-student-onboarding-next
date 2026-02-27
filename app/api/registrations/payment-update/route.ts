import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const registrationId = formData.get("registration_id") as string;
        const paymentUrl = formData.get("payment_url") as string;

        if (!registrationId || !paymentUrl) {
            return NextResponse.json(
                { success: false, error: "Missing required parameters" },
                { status: 400 },
            );
        }

        // Fetch existing registration to append to payment slips
        const registration = await prisma.cCARegistration.findUnique({
            where: { id: BigInt(registrationId) }
        });

        if (!registration) {
            return NextResponse.json(
                { success: false, error: "Registration not found" },
                { status: 404 },
            );
        }

        // Safely append to the JSON paymentSlip array
        let currentSlips: any[] = [];
        if (Array.isArray(registration.paymentSlip)) {
            currentSlips = [...registration.paymentSlip];
        } else if (registration.paymentSlip) {
            currentSlips = [registration.paymentSlip];
        }

        currentSlips.push({
            id: `slip_${Date.now()}`,
            url: paymentUrl,
            uploadedAt: new Date().toISOString(),
            status: "pending"
        });

        await prisma.cCARegistration.update({
            where: { id: BigInt(registrationId) },
            data: {
                paymentSlip: currentSlips
            }
        });

        return NextResponse.json({
            success: true,
            message: "Payment slip updated successfully",
        });
    } catch (error: any) {
        console.error("Payment update error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 },
        );
    }
}
