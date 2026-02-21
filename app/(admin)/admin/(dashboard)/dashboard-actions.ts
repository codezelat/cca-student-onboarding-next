"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDashboardStats() {
    const [active, trashed, total, general, special] = await Promise.all([
        prisma.cCARegistration.count({ where: { deletedAt: null } }),
        prisma.cCARegistration.count({ where: { NOT: { deletedAt: null } } }),
        prisma.cCARegistration.count(),
        prisma.cCARegistration.count({
            where: {
                deletedAt: null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tags: { path: [], array_contains: "General Rate" } as any,
            },
        }),
        prisma.cCARegistration.count({
            where: {
                deletedAt: null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tags: { path: [], array_contains: "Special 50% Offer" } as any,
            },
        }),
    ]);

    // Top program query
    const topProgramResult = await prisma.cCARegistration.groupBy({
        by: ["programId"],
        where: { deletedAt: null },
        _count: {
            programId: true,
        },
        orderBy: {
            _count: {
                programId: "desc",
            },
        },
        take: 1,
    });

    const topProgram = topProgramResult[0]
        ? {
              id: topProgramResult[0].programId,
              count: topProgramResult[0]._count.programId,
          }
        : null;

    return {
        activeRegistrations: Number(active),
        trashedRegistrations: Number(trashed),
        totalRegistrations: Number(total),
        generalRateCount: Number(general),
        specialOfferCount: Number(special),
        topProgram,
    };
}

export async function getRegistrations(params: {
    scope?: string;
    search?: string;
    programFilter?: string;
    tagFilter?: string;
}) {
    const { scope = "active", search, programFilter, tagFilter } = params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Scope handling
    if (scope === "active") {
        where.deletedAt = null;
    } else if (scope === "trashed") {
        where.NOT = { deletedAt: null };
    }

    // Search handling
    if (search) {
        where.OR = [
            { registerId: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
            { emailAddress: { contains: search, mode: "insensitive" } },
            { nicNumber: { contains: search, mode: "insensitive" } },
            { whatsappNumber: { contains: search, mode: "insensitive" } },
        ];
    }

    // Program Filter
    if (programFilter) {
        where.programId = programFilter;
    }

    // Tag Filter
    if (tagFilter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where.tags = { path: [], array_contains: tagFilter } as any;
    }

    const registrations = await prisma.cCARegistration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            program: {
                select: {
                    name: true,
                    code: true,
                },
            },
        },
    });

    return registrations.map((reg) => ({
        ...reg,
        id: Number(reg.id),
        createdAt: reg.createdAt.toISOString(),
        updatedAt: reg.updatedAt.toISOString(),
        deletedAt: reg.deletedAt ? reg.deletedAt.toISOString() : null,
        dateOfBirth: reg.dateOfBirth.toISOString(),
        fullAmount: reg.fullAmount ? reg.fullAmount.toString() : null,
        currentPaidAmount: reg.currentPaidAmount
            ? reg.currentPaidAmount.toString()
            : null,
    }));
}

export async function getActivePrograms() {
    const programs = await prisma.program.findMany({
        select: {
            code: true,
            name: true,
        },
        orderBy: { displayOrder: "asc" },
    });
    return programs.map((p) => ({
        programId: p.code,
        programName: p.name,
    }));
}

export async function toggleRegistrationTrash(id: number, restore: boolean) {
    await prisma.cCARegistration.update({
        where: { id: BigInt(id) },
        data: {
            deletedAt: restore ? null : new Date(),
        },
    });
    revalidatePath("/admin");
}

export async function purgeRegistration(id: number) {
    await prisma.cCARegistration.delete({
        where: { id: BigInt(id) },
    });
    revalidatePath("/admin");
}

export async function getRegistrationById(id: number) {
    const registration = await prisma.cCARegistration.findUnique({
        where: { id: BigInt(id) },
        include: {
            program: {
                select: {
                    name: true,
                    code: true,
                    yearLabel: true,
                    durationLabel: true,
                },
            },
            payments: {
                orderBy: { createdAt: "desc" },
            },
        },
    });

    if (!registration) return null;

    return {
        ...registration,
        id: Number(registration.id),
        createdAt: registration.createdAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
        deletedAt: registration.deletedAt
            ? registration.deletedAt.toISOString()
            : null,
        dateOfBirth: registration.dateOfBirth.toISOString(),
        fullAmount: registration.fullAmount
            ? registration.fullAmount.toString()
            : null,
        currentPaidAmount: registration.currentPaidAmount
            ? registration.currentPaidAmount.toString()
            : null,
        qualificationCompletedDate: registration.qualificationCompletedDate
            ? registration.qualificationCompletedDate.toISOString()
            : null,
        qualificationExpectedCompletionDate:
            registration.qualificationExpectedCompletionDate
                ? registration.qualificationExpectedCompletionDate.toISOString()
                : null,
        payments: registration.payments.map((p) => ({
            ...p,
            id: Number(p.id),
            amount: p.amount.toString(),
            paymentDate: p.paymentDate.toISOString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        })),
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRegistration(id: number, data: any) {
    // Basic scrubbing of data to ensure we don't accidentally update system fields
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        id: _id,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        createdAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        updatedAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        deletedAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        registerId,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        program,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        payments,
        ...updateData
    } = data;

    // Convert string dates back to Date objects if they exist
    if (updateData.dateOfBirth)
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.qualificationCompletedDate)
        updateData.qualificationCompletedDate = new Date(
            updateData.qualificationCompletedDate,
        );
    if (updateData.qualificationExpectedCompletionDate)
        updateData.qualificationExpectedCompletionDate = new Date(
            updateData.qualificationExpectedCompletionDate,
        );

    // Convert numbers/decimals
    if (updateData.fullAmount)
        updateData.fullAmount = parseFloat(updateData.fullAmount);
    if (updateData.currentPaidAmount)
        updateData.currentPaidAmount = parseFloat(updateData.currentPaidAmount);

    const updated = await prisma.cCARegistration.update({
        where: { id: BigInt(id) },
        data: updateData,
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/registrations/${id}`);
    return { success: true, registration: updated };
}
