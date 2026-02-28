"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * BigInt to JSON helper
 */
function serialize(data: any) {
    return JSON.parse(
        JSON.stringify(data, (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
        ),
    );
}

export async function getAllPrograms(params?: {
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
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
        ];
    }

    const total = await prisma.program.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * safePageSize;

    const programs = await prisma.program.findMany({
        where,
        include: {
            _count: {
                select: {
                    registrations: true,
                    intakeWindows: true,
                },
            },
            intakeWindows: {
                where: { isActive: true },
                select: { windowName: true, opensAt: true, closesAt: true },
            },
        },
        orderBy: { name: "asc" },
        skip,
        take: safePageSize,
    });

    const normalizedPrograms = programs.map((program) => ({
        ...program,
        programId: program.code,
    }));

    return serialize({
        data: normalizedPrograms,
        total,
        page,
        pageSize: safePageSize,
        totalPages,
    });
}

export async function getProgramById(id: string) {
    const program = await prisma.program.findUnique({
        where: { id: BigInt(id) },
        include: {
            intakeWindows: {
                orderBy: { opensAt: "desc" },
            },
        },
    });

    if (!program) return null;
    return serialize({
        ...program,
        programId: program.code,
    });
}

export async function toggleProgramStatus(id: string, currentStatus: boolean) {
    await prisma.program.update({
        where: { id: BigInt(id) },
        data: { isActive: !currentStatus },
    });

    revalidatePath("/admin/programs");
}

export async function upsertProgram(data: any) {
    const { id, ...programData } = data;

    // Ensure numeric types
    if (programData.basePrice)
        programData.basePrice = parseFloat(programData.basePrice);
    if (programData.displayOrder)
        programData.displayOrder = parseInt(programData.displayOrder);

    let result;
    if (id) {
        result = await prisma.program.update({
            where: { id: BigInt(id) },
            data: programData,
        });
    } else {
        result = await prisma.program.create({
            data: programData,
        });
    }

    revalidatePath("/admin/programs");
    return serialize(result);
}

export async function deleteProgram(id: string) {
    // Check if it has registrations first
    const program = await prisma.program.findUnique({
        where: { id: BigInt(id) },
        select: { code: true },
    });

    if (!program) {
        throw new Error("Program not found");
    }

    const regCount = await prisma.cCARegistration.count({
        where: {
            programId: program.code,
        },
    });

    if (regCount > 0) {
        throw new Error("Cannot delete program with active registrations.");
    }

    await prisma.program.delete({
        where: { id: BigInt(id) },
    });

    revalidatePath("/admin/programs");
}

export async function getProgramIntakes(
    programId: string,
    params?: {
        page?: number;
        pageSize?: number;
    },
) {
    const requestedPage = Math.max(1, params?.page ?? 1);
    const safePageSize = Math.min(Math.max(1, params?.pageSize ?? 20), 100);
    const where = { programId: BigInt(programId) };

    const total = await prisma.programIntakeWindow.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const page = Math.min(requestedPage, totalPages);
    const skip = (page - 1) * safePageSize;

    const intakes = await prisma.programIntakeWindow.findMany({
        where,
        orderBy: { opensAt: "desc" },
        skip,
        take: safePageSize,
    });

    return serialize({
        data: intakes,
        total,
        page,
        pageSize: safePageSize,
        totalPages,
    });
}

export async function upsertIntakeWindow(data: any) {
    const { id, programId, ...intakeData } = data;

    // Convert dates
    intakeData.opensAt = new Date(intakeData.opensAt);
    intakeData.closesAt = new Date(intakeData.closesAt);
    if (intakeData.priceOverride)
        intakeData.priceOverride = parseFloat(intakeData.priceOverride);

    let result;
    if (id) {
        result = await prisma.programIntakeWindow.update({
            where: { id: BigInt(id) },
            data: intakeData,
        });
    } else {
        result = await prisma.programIntakeWindow.create({
            data: {
                ...intakeData,
                programId: BigInt(programId),
            },
        });
    }

    revalidatePath(`/admin/programs/${programId}/intakes`);
    revalidatePath("/admin/programs"); // Refresh dashboard stats too
    return serialize(result);
}

export async function toggleIntakeStatus(
    id: string,
    programId: string,
    currentStatus: boolean,
) {
    await prisma.programIntakeWindow.update({
        where: { id: BigInt(id) },
        data: { isActive: !currentStatus },
    });
    revalidatePath(`/admin/programs/${programId}/intakes`);
    revalidatePath("/admin/programs");
}

export async function deleteIntakeWindow(id: string, programId: string) {
    await prisma.programIntakeWindow.delete({
        where: { id: BigInt(id) },
    });
    revalidatePath(`/admin/programs/${programId}/intakes`);
    revalidatePath("/admin/programs");
}
