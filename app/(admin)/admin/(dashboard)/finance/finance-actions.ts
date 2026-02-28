"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    getAdminActorFromRequestHeaders,
    logActivitySafe,
} from "@/lib/server/activity-log";

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

async function getRegistrationBalanceSnapshot(registrationId: string | bigint) {
    return prisma.cCARegistration.findUnique({
        where: { id: typeof registrationId === "bigint" ? registrationId : BigInt(registrationId) },
        select: {
            id: true,
            registerId: true,
            fullName: true,
            currentPaidAmount: true,
            fullAmount: true,
            updatedAt: true,
        },
    });
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
    const actor = await getAdminActorFromRequestHeaders();
    const { registrationId, amount, paymentMethod, reference, paidAt, remark, status } =
        data;
    const numericAmount = parseFloat(amount);
    const beforeRegistration = await getRegistrationBalanceSnapshot(registrationId);

    try {
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
                amount: numericAmount,
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
                        currentPaidAmount: currentTotal + numericAmount,
                    },
                });
            }
        } else if (payment.status === "void") {
            const registration = await prisma.cCARegistration.findUnique({
                where: { id: BigInt(registrationId) },
            });

            if (registration && registration.currentPaidAmount) {
                const currentTotal = Number(registration.currentPaidAmount);
                const newTotal = Math.max(0, currentTotal - numericAmount);
                await prisma.cCARegistration.update({
                    where: { id: BigInt(registrationId) },
                    data: {
                        currentPaidAmount: newTotal,
                    },
                });
            }
        }

        const afterRegistration = await getRegistrationBalanceSnapshot(registrationId);
        await logActivitySafe({
            actor,
            category: "payment",
            action: "payment_added",
            status: "success",
            subjectType: "RegistrationPayment",
            subjectId: payment.id,
            subjectLabel: `Payment #${payment.paymentNo}`,
            message: "Payment entry created",
            routeName: "/admin/finance",
            beforeData: beforeRegistration,
            afterData: {
                payment,
                registration: afterRegistration,
            },
            meta: {
                registrationId,
                amount: numericAmount,
                paymentStatus: payment.status,
            },
        });

        revalidatePath("/admin/finance");
        revalidatePath(`/admin/registrations/${registrationId}`);
        return serialize(payment);
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "payment",
            action: "payment_add_failed",
            status: "failure",
            subjectType: "CCARegistration",
            subjectId: registrationId,
            subjectLabel: beforeRegistration?.registerId || String(registrationId),
            message: "Failed to add payment entry",
            routeName: "/admin/finance",
            beforeData: beforeRegistration,
            meta: {
                amount: numericAmount,
                paymentMethod,
                paymentStatus: status === "VOID" ? "void" : "active",
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
}

export async function voidPayment(id: string, reason: string) {
    const actor = await getAdminActorFromRequestHeaders();
    const payment = await prisma.registrationPayment.findUnique({
        where: { id: BigInt(id) },
    });

    if (!payment) {
        await logActivitySafe({
            actor,
            category: "payment",
            action: "payment_void_not_found",
            status: "failure",
            subjectType: "RegistrationPayment",
            subjectId: id,
            subjectLabel: id,
            message: "Payment not found while attempting void",
            routeName: "/admin/finance",
        });
        return;
    }

    const beforeRegistration = await getRegistrationBalanceSnapshot(
        payment.ccaRegistrationId,
    );

    try {
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

        const updatedPayment = await prisma.registrationPayment.update({
            where: { id: BigInt(id) },
            data: {
                status: "void",
                note: `VOIDED: ${reason}`,
                voidReason: reason,
                voidedAt: new Date(),
            },
        });

        const afterRegistration = await getRegistrationBalanceSnapshot(
            payment.ccaRegistrationId,
        );

        await logActivitySafe({
            actor,
            category: "payment",
            action: "payment_voided",
            status: "success",
            subjectType: "RegistrationPayment",
            subjectId: id,
            subjectLabel: `Payment #${payment.paymentNo}`,
            message: "Payment marked as void",
            routeName: "/admin/finance",
            beforeData: { payment, registration: beforeRegistration },
            afterData: { payment: updatedPayment, registration: afterRegistration },
            meta: { reason },
        });

        revalidatePath("/admin/finance");
        revalidatePath(`/admin/registrations/${payment.ccaRegistrationId}`);
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "payment",
            action: "payment_void_failed",
            status: "failure",
            subjectType: "RegistrationPayment",
            subjectId: id,
            subjectLabel: `Payment #${payment.paymentNo}`,
            message: "Failed to void payment",
            routeName: "/admin/finance",
            beforeData: { payment, registration: beforeRegistration },
            meta: {
                reason,
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
}
