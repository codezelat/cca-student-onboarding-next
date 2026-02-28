"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    getAdminActorFromRequestHeaders,
    logActivitySafe,
} from "@/lib/server/activity-log";
import {
    getNextPaymentNo,
    syncRegistrationPaidAmount,
} from "@/lib/server/payment-ledger";

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

function buildPaymentLedgerWhere(search: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        registration: {
            is: {
                deletedAt: null,
            },
        },
    };

    if (search) {
        where.AND = [
            {
                OR: [
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
                                fullName: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                    {
                        registration: {
                            is: {
                                registerId: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                    {
                        registration: {
                            is: {
                                programId: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                ],
            },
        ];
    }

    return where;
}

export async function getFinanceStats() {
    const [activePaymentsStats, deductionPaymentsStats, activeRegCount] = await Promise.all([
        prisma.registrationPayment.aggregate({
            where: {
                status: "active",
                registration: {
                    is: {
                        deletedAt: null,
                    },
                },
            },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        prisma.registrationPayment.aggregate({
            where: {
                status: "void",
                voidedAt: null,
                registration: {
                    is: {
                        deletedAt: null,
                    },
                },
            },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        prisma.cCARegistration.count({
            where: { deletedAt: null },
        }),
    ]);

    const activeTotal = Number(activePaymentsStats._sum.amount || 0);
    const deductionTotal = Number(deductionPaymentsStats._sum.amount || 0);
    const netTotal = activeTotal - deductionTotal;
    const activeCount = Number(activePaymentsStats._count._all || 0);
    const deductionCount = Number(deductionPaymentsStats._count._all || 0);

    return {
        totalRevenue: netTotal.toString(),
        totalPayments: activeCount + deductionCount,
        voidedAmount: deductionTotal.toString(),
        voidedPayments: deductionCount,
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
    const where = buildPaymentLedgerWhere(search);

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

export async function getPaymentLedgerForExport(params?: { search?: string }) {
    const search = params?.search?.trim() || "";
    const where = buildPaymentLedgerWhere(search);

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
    });

    return serialize(payments);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addPayment(data: any) {
    const actor = await getAdminActorFromRequestHeaders();
    const { registrationId, amount, paymentMethod, reference, paidAt, remark, status } =
        data;
    const numericAmount = parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Amount must be greater than zero");
    }

    const registrationBigInt = BigInt(registrationId);
    const beforeRegistration = await getRegistrationBalanceSnapshot(registrationId);
    const registrationRecord = await prisma.cCARegistration.findUnique({
        where: { id: registrationBigInt },
        select: {
            id: true,
            deletedAt: true,
        },
    });

    if (!registrationRecord || registrationRecord.deletedAt) {
        throw new Error("Cannot add payment to a trashed registration");
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let payment: any = null;

        await prisma.$transaction(async (tx) => {
            const nextPaymentNo = await getNextPaymentNo(tx, registrationBigInt);
            payment = await tx.registrationPayment.create({
                data: {
                    ccaRegistrationId: registrationBigInt,
                    paymentNo: nextPaymentNo,
                    amount: numericAmount,
                    paymentMethod,
                    receiptReference: reference,
                    paymentDate: new Date(paidAt),
                    note: remark,
                    status: status === "VOID" ? "void" : "active",
                },
            });
            await syncRegistrationPaidAmount(tx, registrationBigInt);
        });

        if (!payment) {
            throw new Error("Failed to create payment");
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let updatedPayment: any = null;

        await prisma.$transaction(async (tx) => {
            updatedPayment = await tx.registrationPayment.update({
                where: { id: BigInt(id) },
                data: {
                    status: "void",
                    note: `VOIDED: ${reason}`,
                    voidReason: reason,
                    voidedAt: new Date(),
                },
            });

            await syncRegistrationPaidAmount(tx, payment.ccaRegistrationId);
        });

        if (!updatedPayment) {
            throw new Error("Failed to update payment status");
        }

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
