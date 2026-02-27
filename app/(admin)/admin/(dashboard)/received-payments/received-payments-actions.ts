"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * BigInt to JSON helper
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(data: any) {
    return JSON.parse(
        JSON.stringify(data, (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
        ),
    );
}

export async function getPendingPayments({
    search = "",
    status = "all",
}: {
    search?: string;
    status?: string;
}) {
    // 1. Fetch registrations that have basic text matching the search query (if provided)
    const registrations = await prisma.cCARegistration.findMany({
        where: {
            deletedAt: null,
            ...(search
                ? {
                    OR: [
                        { fullName: { contains: search, mode: "insensitive" } },
                        { nicNumber: { contains: search, mode: "insensitive" } },
                        { emailAddress: { contains: search, mode: "insensitive" } },
                        { whatsappNumber: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {}),
        },
        select: {
            id: true,
            registerId: true,
            fullName: true,
            nicNumber: true,
            passportNumber: true,
            emailAddress: true,
            whatsappNumber: true,
            paymentSlip: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // 2. Filter down to only those registrations whose paymentSlip array contains at least one "pending" slip
    const pendingExtracts: any[] = [];

    for (const reg of registrations) {
        if (!reg.paymentSlip) continue;

        let slips: any[] = [];
        if (Array.isArray(reg.paymentSlip)) {
            slips = reg.paymentSlip;
        } else if (typeof reg.paymentSlip === "object") {
            // Edge case where it's a single object
            slips = [reg.paymentSlip];
        }

        slips.forEach((slip, index) => {
            const currentSlipStatus = slip.status || "pending";
            if (status === "all" || currentSlipStatus === status) {
                pendingExtracts.push({
                    registrationId: reg.id.toString(),
                    registerId: reg.registerId,
                    fullName: reg.fullName,
                    identifier: reg.nicNumber || reg.passportNumber || "N/A",
                    emailAddress: reg.emailAddress,
                    whatsappNumber: reg.whatsappNumber,
                    slipId: slip.id || `index_${index}`,
                    slipIndex: index,
                    slipUrl: slip.url,
                    status: currentSlipStatus,
                    uploadedAt: slip.uploadedAt || new Date().toISOString(),
                });
            }
        });
    }

    // Sort by upload date (oldest first, to process queue fairly)
    pendingExtracts.sort(
        (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );

    return serialize(pendingExtracts);
}

export async function approvePaymentSlip(
    registrationId: string,
    slipIndex: number,
    amount: number
) {
    const reg = await prisma.cCARegistration.findUnique({
        where: { id: BigInt(registrationId) },
    });

    if (!reg || !reg.paymentSlip) throw new Error("Registration or slip not found");

    let slips: any[] = [];
    try {
        slips = JSON.parse(JSON.stringify(reg.paymentSlip || []));
    } catch {
        slips = [];
    }

    if (!Array.isArray(slips)) {
        slips = [slips];
    }

    if (!slips[slipIndex]) throw new Error("Slip index out of bounds");
    if (slips[slipIndex].status === "approved" || slips[slipIndex].status === "declined") {
        throw new Error(`This payment slip has already been ${slips[slipIndex].status}.`);
    }

    // 1. Update Slip Status
    slips[slipIndex].status = "approved";
    slips[slipIndex].approvedAt = new Date().toISOString();

    const currentPaidAmount = reg.currentPaidAmount ? Number(reg.currentPaidAmount) : 0;
    const newPaidAmount = currentPaidAmount + amount;

    // 2. Update Registration
    await prisma.cCARegistration.update({
        where: { id: BigInt(registrationId) },
        data: {
            paymentSlip: slips,
            currentPaidAmount: newPaidAmount
        },
    });

    // 3. Determine Payment Number (max + 1)
    const lastPayment = await prisma.registrationPayment.findFirst({
        where: { ccaRegistrationId: BigInt(registrationId) },
        orderBy: { paymentNo: "desc" },
    });
    const nextPaymentNo = (lastPayment?.paymentNo ?? 0) + 1;

    // 4. Create Formal Payment Record
    await prisma.registrationPayment.create({
        data: {
            ccaRegistrationId: BigInt(registrationId),
            paymentNo: nextPaymentNo,
            amount,
            paymentMethod: "Bank Transfer", // Defaulting as slips usually represent transfers
            paymentDate: new Date(),
            receiptReference: slips[slipIndex].id || `Slip Approved`,
            note: "Approved from student portal slip upload",
            status: "active",
        }
    });

    revalidatePath("/admin/received-payments");
    revalidatePath(`/admin/registrations/${registrationId}`);
    return { success: true };
}

export async function declinePaymentSlip(registrationId: string, slipIndex: number) {
    const reg = await prisma.cCARegistration.findUnique({
        where: { id: BigInt(registrationId) },
    });

    if (!reg || !reg.paymentSlip) throw new Error("Registration or slip not found");

    let slips: any[] = [];
    try {
        slips = JSON.parse(JSON.stringify(reg.paymentSlip || []));
    } catch {
        slips = [];
    }

    if (!Array.isArray(slips)) {
        slips = [slips];
    }

    if (!slips[slipIndex]) throw new Error("Slip index out of bounds");
    if (slips[slipIndex].status === "approved" || slips[slipIndex].status === "declined") {
        throw new Error(`This payment slip has already been ${slips[slipIndex].status}.`);
    }

    // 1. Update Slip Status
    slips[slipIndex].status = "declined";
    slips[slipIndex].declinedAt = new Date().toISOString();

    await prisma.cCARegistration.update({
        where: { id: BigInt(registrationId) },
        data: {
            paymentSlip: slips,
        },
    });

    revalidatePath("/admin/received-payments");
    return { success: true };
}
