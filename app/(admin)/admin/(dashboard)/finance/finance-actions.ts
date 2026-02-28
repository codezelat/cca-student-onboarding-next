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
    const [totalPaid, totalPayments, activeRegCount] = await Promise.all([
        prisma.registrationPayment.aggregate({
            where: { status: "active" },
            _sum: { amount: true },
        }),
        prisma.registrationPayment.count(),
        prisma.cCARegistration.count({
            where: { deletedAt: null },
        }),
    ]);

    return {
        totalRevenue: totalPaid._sum.amount?.toString() || "0",
        totalPayments,
        activeRegistrations: activeRegCount,
    };
}

export async function getPaymentLedger(params?: {
    search?: string;
    page?: number;
    pageSize?: number;
}) {
    const search = params?.search?.trim() || "";
    const requestedPage = Math.max(1, params?.page ?? 1);
    const safePageSize = Math.min(Math.max(1, params?.pageSize ?? 20), 100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (search) {
        where.OR = [
            {
                receiptReference: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                paymentMethod: {
                    contains: search,
                    mode: "insensitive",
                },
            },
            {
                registration: {
                    is: {
                        fullName: { contains: search, mode: "insensitive" },
                    },
                },
            },
            {
                registration: {
                    is: {
                        registerId: { contains: search, mode: "insensitive" },
                    },
                },
            },
            {
                registration: {
                    is: {
                        programId: { contains: search, mode: "insensitive" },
                    },
                },
            },
        ];
    }

    const total = await prisma.registrationPayment.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * safePageSize;

    const payments = await prisma.registrationPayment.findMany({
        where,
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
        skip,
        take: safePageSize,
    });

    return serialize({
        data: payments,
        total,
        page,
        pageSize: safePageSize,
        totalPages,
    });
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

    if (payment.status === "active") {
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
    } else if (payment.status === "void") {
        const registration = await prisma.cCARegistration.findUnique({
            where: { id: BigInt(registrationId) },
        });

        if (registration && registration.currentPaidAmount) {
            const currentTotal = Number(registration.currentPaidAmount);
            const newTotal = Math.max(0, currentTotal - parseFloat(amount));
            await prisma.cCARegistration.update({
                where: { id: BigInt(registrationId) },
                data: {
                    currentPaidAmount: newTotal,
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
