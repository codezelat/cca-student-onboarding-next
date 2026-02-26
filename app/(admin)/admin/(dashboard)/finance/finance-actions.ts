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

export async function getFinanceStats() {
    // Total Expected (Sum of all registration program prices)
    // Actually, we need to join registrations with their program's price or intake price
    // For simplicity in this session, we'll sum the payments first.

    // Total Paid
    const totalPaid = await prisma.registrationPayment.aggregate({
        where: { status: "active" },
        _sum: { amount: true },
    });

    // Count registrations
    const activeRegCount = await prisma.cCARegistration.count({
        where: { deletedAt: null },
    });

    return {
        totalRevenue: totalPaid._sum.amount?.toString() || "0",
        totalPayments: await prisma.registrationPayment.count(),
        activeRegistrations: activeRegCount,
    };
}

export async function getPaymentLedger() {
    const payments = await prisma.registrationPayment.findMany({
        include: {
            registration: {
                select: {
                    fullName: true,
                    registerId: true,
                    programId: true,
                },
            },
        },
        orderBy: { paymentDate: "desc" },
        take: 100,
    });

    return serialize(payments);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addPayment(data: any) {
    const { registrationId, amount, paymentMethod, reference, paidAt, remark, status } =
        data;

    // We need to determine the paymentNo. Logic: max(paymentNo) + 1 for this registration
    const lastPayment = await prisma.registrationPayment.findFirst({
        where: { ccaRegistrationId: BigInt(registrationId) },
        orderBy: { paymentNo: "desc" },
    });
    const nextPaymentNo = (lastPayment?.paymentNo ?? 0) + 1;

    const payment = await prisma.registrationPayment.create({
        data: {
            ccaRegistrationId: BigInt(registrationId),
            paymentNo: nextPaymentNo,
            amount: parseFloat(amount),
            paymentMethod,
            receiptReference: reference,
            paymentDate: new Date(paidAt),
            note: remark,
            status: status === "VOID" ? "void" : "active",
        },
    });

    if (status !== "VOID") {
        const registration = await prisma.cCARegistration.findUnique({
            where: { id: BigInt(registrationId) },
        });

        if (registration) {
            const currentTotal = registration.currentPaidAmount ? Number(registration.currentPaidAmount) : 0;
            await prisma.cCARegistration.update({
                where: { id: BigInt(registrationId) },
                data: {
                    currentPaidAmount: currentTotal + parseFloat(amount),
                },
            });
        }
    }

    revalidatePath("/admin/finance");
    revalidatePath(`/admin/registrations/${registrationId}`);
    return serialize(payment);
}

export async function voidPayment(id: string, reason: string) {
    const payment = await prisma.registrationPayment.findUnique({
        where: { id: BigInt(id) },
    });

    if (!payment) return;

    // Only decrement if the payment was previously 'active'
    if (payment.status === "active") {
        const registration = await prisma.cCARegistration.findUnique({
            where: { id: payment.ccaRegistrationId },
        });

        if (registration) {
            const currentTotal = registration.currentPaidAmount ? Number(registration.currentPaidAmount) : 0;
            const newTotal = Math.max(0, currentTotal - Number(payment.amount));
            await prisma.cCARegistration.update({
                where: { id: payment.ccaRegistrationId },
                data: {
                    currentPaidAmount: newTotal,
                },
            });
        }
    }

    await prisma.registrationPayment.update({
        where: { id: BigInt(id) },
        data: {
            status: "void",
            note: `VOIDED: ${reason}`,
            voidReason: reason,
            voidedAt: new Date(),
        },
    });

    revalidatePath("/admin/finance");
    revalidatePath(`/admin/registrations/${payment.ccaRegistrationId}`);
}
