"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  getAdminActorFromRequestHeaders,
  logActivitySafe,
} from "@/lib/server/activity-log";
import { assertAdminFromServerHeaders } from "@/lib/server/admin-auth";
import { REGISTRATION_PROGRAM_OPTIONS_CACHE_TAG } from "@/lib/server/program-cache";
import type {
  EditableProgram,
  ProgramCardItem,
  ProgramIntakeItem,
  ProgramRegistrationsSort,
  ProgramStatusSort,
} from "./programs-types";

/**
 * BigInt to JSON helper
 */
function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
}

function revalidateProgramAdminViews({
  includeFinance = false,
}: {
  includeFinance?: boolean;
} = {}) {
  revalidateTag(REGISTRATION_PROGRAM_OPTIONS_CACHE_TAG, "max");
  revalidatePath("/admin");
  revalidatePath("/admin/programs");

  if (includeFinance) {
    revalidatePath("/admin/finance");
    revalidatePath("/admin/received-payments");
  }
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function toDatabaseUserId(value: unknown): bigint | null {
  const normalized =
    typeof value === "string" ? value.trim() : String(value ?? "");
  return /^\d+$/.test(normalized) ? BigInt(normalized) : null;
}

const databaseIdSchema = z.preprocess(
  (value) =>
    typeof value === "number" && Number.isSafeInteger(value)
      ? String(value)
      : value,
  z.string().trim().regex(/^[1-9]\d*$/),
);

const programModuleSchema = z.object({
  id: databaseIdSchema.optional(),
  programId: databaseIdSchema,
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(200),
  creditValue: z
    .union([z.coerce.number().finite().min(0).max(999.99), z.null()])
    .optional(),
  displayOrder: z
    .coerce.number()
    .finite()
    .int()
    .min(0)
    .max(10000)
    .default(0),
  isActive: z.boolean().default(true),
});

export type ProgramModuleItem = {
  id: string;
  code: string;
  name: string;
  creditValue: string | null;
  displayOrder: number;
  isActive: boolean;
};

function toProgramModuleItem(module: {
  id: bigint;
  code: string;
  name: string;
  creditValue: Prisma.Decimal | number | string | null;
  displayOrder: number;
  isActive: boolean;
}): ProgramModuleItem {
  return {
    id: String(module.id),
    code: module.code,
    name: module.name,
    creditValue:
      module.creditValue === null ? null : String(module.creditValue),
    displayOrder: module.displayOrder,
    isActive: module.isActive,
  };
}

function parseStatusSort(value: string | undefined): ProgramStatusSort {
  if (value === "active_first" || value === "inactive_first") {
    return value;
  }

  return "none";
}

function parseRegistrationsSort(
  value: string | undefined,
): ProgramRegistrationsSort {
  if (value === "most" || value === "fewest") {
    return value;
  }

  return "none";
}

function toEditableProgram(program: {
  id: bigint | number | string;
  code: string;
  name: string;
  yearLabel: string;
  durationLabel: string;
  basePrice: Prisma.Decimal | number | string | null;
  currency: string | null;
  isActive: boolean;
}): EditableProgram {
  return {
    id: String(program.id),
    programId: program.code,
    code: program.code,
    name: program.name,
    yearLabel: program.yearLabel,
    durationLabel: program.durationLabel,
    basePrice: program.basePrice === null ? "0" : String(program.basePrice),
    currency: program.currency,
    isActive: program.isActive,
  };
}

function toProgramIntakeItem(intake: {
  id: bigint | number | string;
  windowName: string;
  opensAt: Date | string;
  closesAt: Date | string;
  priceOverride: Prisma.Decimal | number | string | null;
  isActive: boolean;
}): ProgramIntakeItem {
  return {
    id: String(intake.id),
    windowName: intake.windowName,
    opensAt: toIsoString(intake.opensAt),
    closesAt: toIsoString(intake.closesAt),
    priceOverride:
      intake.priceOverride === null ? null : String(intake.priceOverride),
    isActive: intake.isActive,
  };
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
  statusSort?: ProgramStatusSort;
  registrationsSort?: ProgramRegistrationsSort;
  page?: number;
  pageSize?: number;
}) {
  const search = params?.search?.trim() || "";
  const statusSort = parseStatusSort(params?.statusSort?.trim());
  const registrationsSort = parseRegistrationsSort(
    params?.registrationsSort?.trim(),
  );
  const requestedPage = Math.max(1, params?.page ?? 1);
  const safePageSize = Math.min(Math.max(1, params?.pageSize ?? 20), 100);

  const where: Prisma.ProgramWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const orderBy: Prisma.ProgramOrderByWithRelationInput[] = [];

  if (statusSort === "active_first") {
    orderBy.push({ isActive: "desc" });
  } else if (statusSort === "inactive_first") {
    orderBy.push({ isActive: "asc" });
  }

  if (registrationsSort === "most") {
    orderBy.push({ registrations: { _count: "desc" } });
  } else if (registrationsSort === "fewest") {
    orderBy.push({ registrations: { _count: "asc" } });
  }

  orderBy.push({ name: "asc" });

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
    orderBy,
    skip,
    take: safePageSize,
  });

  const normalizedPrograms: ProgramCardItem[] = programs.map((program) => ({
    id: String(program.id),
    programId: program.code,
    name: program.name,
    isActive: program.isActive,
    _count: {
      registrations: program._count.registrations,
      intakeWindows: program._count.intakeWindows,
    },
    intakeWindows: program.intakeWindows.map((intakeWindow) => ({
      windowName: intakeWindow.windowName,
      opensAt: toIsoString(intakeWindow.opensAt),
      closesAt: toIsoString(intakeWindow.closesAt),
    })),
  }));

  return serialize({
    data: normalizedPrograms,
    total,
    page,
    pageSize: safePageSize,
    totalPages,
    statusSort,
    registrationsSort,
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
  return toEditableProgram(program);
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
    revalidateProgramAdminViews();
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
  if (
    programData.basePrice !== undefined &&
    programData.basePrice !== null &&
    programData.basePrice !== ""
  )
    programData.basePrice = parseFloat(String(programData.basePrice));
  if (
    programData.displayOrder !== undefined &&
    programData.displayOrder !== null &&
    programData.displayOrder !== ""
  )
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

    revalidateProgramAdminViews({ includeFinance: true });
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
        (typeof programData.code === "string" ? programData.code : "unknown"),
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
    revalidateProgramAdminViews();
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

  return {
    data: intakes.map(toProgramIntakeItem),
    total,
    page,
    pageSize: safePageSize,
    totalPages,
  };
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
    return toProgramIntakeItem(result);
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

export async function getProgramModules(
  programId: string,
  params?: { page?: number; pageSize?: number },
) {
  await assertAdminFromServerHeaders();
  if (!/^[1-9]\d*$/.test(programId)) {
    throw new Error("Invalid program.");
  }
  const requestedPage = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(Math.max(1, params?.pageSize ?? 20), 100);
  const where = { programId: BigInt(programId) };
  const total = await prisma.programModule.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const modules = await prisma.programModule.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return serialize({
    data: modules.map(toProgramModuleItem),
    total,
    page,
    pageSize,
    totalPages,
  });
}

export async function upsertProgramModule(input: unknown) {
  await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  const parsed = programModuleSchema.safeParse(input);
  if (!parsed.success) {
    await logActivitySafe({
      actor,
      category: "program_module",
      action: "program_module_save_validation_failed",
      status: "failure",
      subjectType: "ProgramModule",
      message: "Program module validation failed",
      routeName: "/admin/programs",
      meta: {
        fields: parsed.error.issues.map((issue) => issue.path.join(".")),
      },
    });
    throw new Error("Enter a valid module code, name, credits, and order.");
  }

  const payload = parsed.data;
  const programId = BigInt(payload.programId);
  const before = payload.id
    ? await prisma.programModule.findUnique({
        where: { id: BigInt(payload.id) },
      })
    : null;
  if (payload.id && (!before || before.programId !== programId)) {
    throw new Error("Module not found.");
  }
  if (!payload.id) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: { id: true },
    });
    if (!program) throw new Error("Program not found.");
  }
  const moduleData = {
    code: payload.code.toUpperCase(),
    name: payload.name,
    creditValue: payload.creditValue ?? null,
    displayOrder: payload.displayOrder,
    isActive: payload.isActive,
    updatedBy: toDatabaseUserId(actor.userId),
  };

  try {
    const moduleRecord = payload.id
      ? await prisma.programModule.update({
          where: { id: BigInt(payload.id) },
          data: moduleData,
        })
      : await prisma.programModule.create({
          data: {
            ...moduleData,
            programId,
            createdBy: toDatabaseUserId(actor.userId),
          },
        });

    await logActivitySafe({
      actor,
      category: "program_module",
      action: payload.id ? "program_module_updated" : "program_module_created",
      status: "success",
      subjectType: "ProgramModule",
      subjectId: moduleRecord.id,
      subjectLabel: moduleRecord.code,
      message: payload.id ? "Program module updated" : "Program module created",
      routeName: `/admin/programs/${payload.programId}/modules`,
      beforeData: before,
      afterData: moduleRecord,
    });
    revalidatePath(`/admin/programs/${payload.programId}/modules`);
    revalidatePath("/admin/programs");
    return toProgramModuleItem(moduleRecord);
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "program_module",
      action: payload.id
        ? "program_module_update_failed"
        : "program_module_create_failed",
      status: "failure",
      subjectType: "ProgramModule",
      subjectId: payload.id ?? null,
      subjectLabel: before?.code ?? payload.code,
      message: "Program module save failed",
      routeName: `/admin/programs/${payload.programId}/modules`,
      beforeData: before,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("This program already has that module code.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new Error("This program is no longer available. Refresh and try again.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new Error("This module is no longer available. Refresh and try again.");
    }
    throw error;
  }
}

export async function deleteProgramModule(idInput: string, programId: string) {
  await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  let id: bigint;
  try {
    id = BigInt(idInput);
  } catch {
    throw new Error("Invalid module.");
  }
  if (!/^[1-9]\d*$/.test(programId)) {
    throw new Error("Invalid program.");
  }
  const before = await prisma.programModule.findUnique({ where: { id } });
  if (!before || String(before.programId) !== programId) {
    throw new Error("Module not found.");
  }

  try {
    await prisma.programModule.delete({ where: { id } });
    await logActivitySafe({
      actor,
      category: "program_module",
      action: "program_module_deleted",
      status: "success",
      subjectType: "ProgramModule",
      subjectId: id,
      subjectLabel: before.code,
      message: "Program module deleted",
      routeName: `/admin/programs/${programId}/modules`,
      beforeData: before,
    });
    revalidatePath(`/admin/programs/${programId}/modules`);
    revalidatePath("/admin/programs");
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "program_module",
      action: "program_module_delete_failed",
      status: "failure",
      subjectType: "ProgramModule",
      subjectId: id,
      subjectLabel: before.code,
      message: "Program module deletion failed",
      routeName: `/admin/programs/${programId}/modules`,
      beforeData: before,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new Error(
        "This module is recorded on a certificate and cannot be deleted.",
      );
    }
    throw error;
  }
}
