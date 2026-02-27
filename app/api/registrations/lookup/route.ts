import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // "local" or "international"
        const identifier = searchParams.get("identifier");

        if (!type || !identifier) {
            return NextResponse.json(
                { success: false, error: "Missing required parameters" },
                { status: 400 }
            );
        }

        let registration;

        if (type === "local") {
            registration = await prisma.cCARegistration.findFirst({
                where: { nicNumber: identifier },
                orderBy: { createdAt: 'desc' }
            });
        } else if (type === "international") {
            registration = await prisma.cCARegistration.findFirst({
                where: { passportNumber: identifier },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            return NextResponse.json(
                { success: false, error: "Invalid type parameter" },
                { status: 400 }
            );
        }

        if (!registration) {
            return NextResponse.json(
                { success: false, error: "Student not found" },
                { status: 404 }
            );
        }

        // Calculate first name from full name
        const firstName = registration.fullName
            ? registration.fullName.split(' ')[0]
            : registration.nameWithInitials.split(' ').pop() || "Student";

        return NextResponse.json({
            success: true,
            data: {
                id: registration.id.toString(),
                firstName: firstName,
                fullName: registration.fullName,
                programName: registration.programName,
                // If fullAmount or currentPaidAmount is null, default to 0
                fullAmount: registration.fullAmount ? Number(registration.fullAmount) : 0,
                paidAmount: registration.currentPaidAmount ? Number(registration.currentPaidAmount) : 0,
                balanceDue: (registration.fullAmount ? Number(registration.fullAmount) : 0) - (registration.currentPaidAmount ? Number(registration.currentPaidAmount) : 0)
            }
        });

    } catch (error: any) {
        console.error("Lookup error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
