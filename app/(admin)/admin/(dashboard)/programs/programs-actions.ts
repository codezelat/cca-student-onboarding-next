"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
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

async function getProgramAuditSnapshot(id: string) {
    return prisma.program.findUnique({
        where: { id: BigInt(id) },
        select: {
            id: true,
            code: true,
            name: true,
            yearLabel: true,
            durationLabel: true,
            basePrice: true,
            currency: true,
            isActive: true,
            displayOrder: true,
            updatedAt: true,
        },
    });
}

async function getIntakeAuditSnapshot(id: string) {
    return prisma.programIntakeWindow.findUnique({
        where: { id: BigInt(id) },
        select: {
            id: true,
            programId: true,
            windowName: true,
            opensAt: true,
            closesAt: true,
            priceOverride: true,
            isActive: true,
            updatedAt: true,
        },
    });
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
    const actor = await getAdminActorFromRequestHeaders();
    const before = await getProgramAuditSnapshot(id);

    try {
        const updated = await prisma.program.update({
            where: { id: BigInt(id) },
            data: { isActive: !currentStatus },
        });

        await logActivitySafe({
            actor,
            category: "program",
            action: "program_status_toggled",
            status: "success",
            subjectType: "Program",
            subjectId: id,
            subjectLabel: updated.code,
            message: `Program status changed to ${updated.isActive ? "active" : "inactive"}`,
            routeName: "/admin/programs",
            beforeData: before,
            afterData: updated,
        });
        revalidatePath("/admin/programs");
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "program",
            action: "program_status_toggle_failed",
            status: "failure",
            subjectType: "Program",
            subjectId: id,
            subjectLabel: before?.code || id,
            message: "Failed to toggle program status",
            routeName: "/admin/programs",
            beforeData: before,
            meta: {
                targetStatus: !currentStatus,
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
}

export async function upsertProgram(data: Record<string, unknown>) {
    const actor = await getAdminActorFromRequestHeaders();
    const { id, ...rest } = data;
    const programData: Record<string, unknown> = { ...rest };
    const before = id ? await getProgramAuditSnapshot(String(id)) : null;
    const hasBasePriceInPayload = Object.prototype.hasOwnProperty.call(
        programData,
        "basePrice",
    );
    const beforeBasePrice =
        before?.basePrice !== undefined && before?.basePrice !== null
            ? String(before.basePrice)
            : null;

    // Ensure numeric types
    if (programData.basePrice !== undefined && programData.basePrice !== null && programData.basePrice !== "")
        programData.basePrice = parseFloat(String(programData.basePrice));
    if (programData.displayOrder !== undefined && programData.displayOrder !== null && programData.displayOrder !== "")
        programData.displayOrder = parseInt(String(programData.displayOrder), 10);

    try {
        let result;
        let syncedRegistrationCount = 0;
        let syncedFullAmount = false;

        if (id) {
            const txResult = await prisma.$transaction(async (tx) => {
                const updated = await tx.program.update({
                    where: { id: BigInt(String(id)) },
                    data: programData as Prisma.ProgramUncheckedUpdateInput,
                });

                const afterBasePrice =
                    updated.basePrice !== undefined && updated.basePrice !== null
                        ? String(updated.basePrice)
                        : null;
                const shouldSyncFees =
                    hasBasePriceInPayload && beforeBasePrice !== afterBasePrice;

                let syncedCount = 0;
                if (shouldSyncFees) {
                    const syncResult = await tx.cCARegistration.updateMany({
                        where: { programId: updated.code },
                        data: { fullAmount: updated.basePrice },
                    });
                    syncedCount = syncResult.count;
                }

                return {
                    updated,
                    shouldSyncFees,
                    syncedCount,
                };
            });

            result = txResult.updated;
            syncedFullAmount = txResult.shouldSyncFees;
            syncedRegistrationCount = txResult.syncedCount;
        } else {
            result = await prisma.program.create({
                data: programData as Prisma.ProgramUncheckedCreateInput,
            });
        }

        await logActivitySafe({
            actor,
            category: "program",
            action: id ? "program_updated" : "program_created",
            status: "success",
            subjectType: "Program",
            subjectId: result.id,
            subjectLabel: result.code,
            message:
                id && syncedFullAmount
                    ? `Program details updated and ${syncedRegistrationCount} registration fee records synced`
                    : id
                      ? "Program details updated"
                      : "New program created",
            routeName: "/admin/programs",
            beforeData: before,
            afterData: result,
            meta: {
                changedKeys: Object.keys(programData),
                syncedFullAmount,
                syncedRegistrationCount,
            },
        });

        revalidatePath("/admin/programs");
        revalidatePath("/admin");
        revalidatePath("/admin/finance");
        revalidatePath("/admin/received-payments");
        return serialize(result);
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "program",
            action: id ? "program_update_failed" : "program_create_failed",
            status: "failure",
            subjectType: "Program",
            subjectId: id ? String(id) : null,
            subjectLabel:
                before?.code ||
                (typeof programData.code === "string"
                    ? programData.code
                    : "unknown"),
            message: id ? "Failed to update program" : "Failed to create program",
            routeName: "/admin/programs",
            beforeData: before,
            meta: {
                changedKeys: Object.keys(programData),
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
}

export async function deleteProgram(id: string) {
    const actor = await getAdminActorFromRequestHeaders();
    // Check if it has registrations first
    const program = await prisma.program.findUnique({
        where: { id: BigInt(id) },
        select: { code: true },
    });

    if (!program) {
        await logActivitySafe({
            actor,
            category: "program",
            action: "program_delete_failed",
            status: "failure",
            subjectType: "Program",
            subjectId: id,
            subjectLabel: id,
            message: "Program not found",
            routeName: "/admin/programs",
        });
        throw new Error("Program not found");
    }

    const regCount = await prisma.cCARegistration.count({
        where: {
            programId: program.code,
        },
    });

    if (regCount > 0) {
        await logActivitySafe({
            actor,
            category: "program",
            action: "program_delete_blocked",
            status: "blocked",
            subjectType: "Program",
            subjectId: id,
            subjectLabel: program.code,
            message: "Program deletion blocked because registrations exist",
            routeName: "/admin/programs",
            meta: {
                registrationCount: regCount,
            },
        });
        throw new Error("Cannot delete program with active registrations.");
    }

    try {
        const deleted = await prisma.program.delete({
            where: { id: BigInt(id) },
        });

        await logActivitySafe({
            actor,
            category: "program",
            action: "program_deleted",
            status: "success",
            subjectType: "Program",
            subjectId: deleted.id,
            subjectLabel: deleted.code,
            message: "Program deleted",
            routeName: "/admin/programs",
            beforeData: deleted,
        });
        revalidatePath("/admin/programs");
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "program",
            action: "program_delete_failed",
            status: "failure",
            subjectType: "Program",
            subjectId: id,
            subjectLabel: program.code,
            message: "Failed to delete program",
            routeName: "/admin/programs",
            meta: {
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
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

export async function upsertIntakeWindow(data: Record<string, unknown>) {
    const actor = await getAdminActorFromRequestHeaders();
    const { id, programId, ...rest } = data;
    const intakeData: Record<string, unknown> = { ...rest };
    const before = id ? await getIntakeAuditSnapshot(String(id)) : null;

    // Convert dates
    intakeData.opensAt = new Date(String(intakeData.opensAt));
    intakeData.closesAt = new Date(String(intakeData.closesAt));
    if (
        intakeData.priceOverride !== undefined &&
        intakeData.priceOverride !== null &&
        intakeData.priceOverride !== ""
    ) {
        intakeData.priceOverride = parseFloat(String(intakeData.priceOverride));
    }

    try {
        let result;
        if (id) {
            result = await prisma.programIntakeWindow.update({
                where: { id: BigInt(String(id)) },
                data: intakeData as Prisma.ProgramIntakeWindowUncheckedUpdateInput,
            });
        } else {
            result = await prisma.programIntakeWindow.create({
                data: {
                    ...(intakeData as Prisma.ProgramIntakeWindowUncheckedCreateInput),
                    programId: BigInt(String(programId)),
                } as Prisma.ProgramIntakeWindowUncheckedCreateInput,
            });
        }

        await logActivitySafe({
            actor,
            category: "program_intake",
            action: id ? "intake_updated" : "intake_created",
            status: "success",
            subjectType: "ProgramIntakeWindow",
            subjectId: result.id,
            subjectLabel: result.windowName,
            message: id
                ? "Program intake window updated"
                : "Program intake window created",
            routeName: `/admin/programs/${programId}/intakes`,
            beforeData: before,
            afterData: result,
            meta: {
                programId,
                changedKeys: Object.keys(intakeData),
            },
        });

        revalidatePath(`/admin/programs/${programId}/intakes`);
        revalidatePath("/admin/programs"); // Refresh dashboard stats too
        return serialize(result);
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "program_intake",
            action: id ? "intake_update_failed" : "intake_create_failed",
            status: "failure",
            subjectType: "ProgramIntakeWindow",
            subjectId: id ? String(id) : null,
            subjectLabel:
                before?.windowName ||
                (typeof intakeData.windowName === "string"
                    ? intakeData.windowName
                    : "unknown"),
            message: id
                ? "Failed to update intake window"
                : "Failed to create intake window",
            routeName: `/admin/programs/${programId}/intakes`,
            beforeData: before,
            meta: {
                programId,
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
}

export async function toggleIntakeStatus(
    id: string,
    programId: string,
    currentStatus: boolean,
) {
    const actor = await getAdminActorFromRequestHeaders();
    const before = await getIntakeAuditSnapshot(id);

    try {
        const updated = await prisma.programIntakeWindow.update({
            where: { id: BigInt(id) },
            data: { isActive: !currentStatus },
        });
        await logActivitySafe({
            actor,
            category: "program_intake",
            action: "intake_status_toggled",
            status: "success",
            subjectType: "ProgramIntakeWindow",
            subjectId: id,
            subjectLabel: updated.windowName,
            message: `Intake status changed to ${updated.isActive ? "active" : "inactive"}`,
            routeName: `/admin/programs/${programId}/intakes`,
            beforeData: before,
            afterData: updated,
        });
        revalidatePath(`/admin/programs/${programId}/intakes`);
        revalidatePath("/admin/programs");
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "program_intake",
            action: "intake_status_toggle_failed",
            status: "failure",
            subjectType: "ProgramIntakeWindow",
            subjectId: id,
            subjectLabel: before?.windowName || id,
            message: "Failed to toggle intake status",
            routeName: `/admin/programs/${programId}/intakes`,
            beforeData: before,
            meta: {
                targetStatus: !currentStatus,
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
}

export async function deleteIntakeWindow(id: string, programId: string) {
    const actor = await getAdminActorFromRequestHeaders();
    const before = await getIntakeAuditSnapshot(id);

    try {
        await prisma.programIntakeWindow.delete({
            where: { id: BigInt(id) },
        });

        await logActivitySafe({
            actor,
            category: "program_intake",
            action: "intake_deleted",
            status: "success",
            subjectType: "ProgramIntakeWindow",
            subjectId: id,
            subjectLabel: before?.windowName || id,
            message: "Program intake window deleted",
            routeName: `/admin/programs/${programId}/intakes`,
            beforeData: before,
        });
        revalidatePath(`/admin/programs/${programId}/intakes`);
        revalidatePath("/admin/programs");
    } catch (error) {
        await logActivitySafe({
            actor,
            category: "program_intake",
            action: "intake_delete_failed",
            status: "failure",
            subjectType: "ProgramIntakeWindow",
            subjectId: id,
            subjectLabel: before?.windowName || id,
            message: "Failed to delete intake window",
            routeName: `/admin/programs/${programId}/intakes`,
            beforeData: before,
            meta: {
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error;
    }
}
