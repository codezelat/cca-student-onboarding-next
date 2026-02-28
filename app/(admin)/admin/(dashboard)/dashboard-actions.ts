"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_cache } from "next/cache";
import {
  getAdminActorFromRequestHeaders,
  logActivitySafe,
} from "@/lib/server/activity-log";

function s<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}

async function getRegistrationAuditSnapshot(id: number) {
  return prisma.cCARegistration.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      registerId: true,
      fullName: true,
      programId: true,
      emailAddress: true,
      whatsappNumber: true,
      deletedAt: true,
      fullAmount: true,
      currentPaidAmount: true,
      updatedAt: true,
    },
  });
}

export async function getDashboardStats() {
  type StatsRow = {
    active: bigint;
    trashed: bigint;
    total: bigint;
    general: bigint;
    special: bigint;
  };

  const [statsRows, topProgramResult] = await Promise.all([
    prisma.$queryRaw<StatsRow[]>`
      SELECT
        COUNT(*)                                                                              AS total,
        COUNT(*) FILTER (WHERE deleted_at IS NULL)                                           AS active,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)                                       AS trashed,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND tags @> '["General Rate"]'::jsonb)     AS general,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND tags @> '["Special 50% Offer"]'::jsonb) AS special
      FROM cca_registrations
    `,
    prisma.cCARegistration.groupBy({
      by: ["programId"],
      where: { deletedAt: null },
      _count: { programId: true },
      orderBy: { _count: { programId: "desc" } },
      take: 1,
    }),
  ]);

  const row = statsRows[0] ?? {
    active: BigInt(0),
    trashed: BigInt(0),
    total: BigInt(0),
    general: BigInt(0),
    special: BigInt(0),
  };

  return {
    activeRegistrations: Number(row.active),
    trashedRegistrations: Number(row.trashed),
    totalRegistrations: Number(row.total),
    generalRateCount: Number(row.general),
    specialOfferCount: Number(row.special),
    topProgram: topProgramResult[0]
      ? {
          id: topProgramResult[0].programId,
          count: topProgramResult[0]._count.programId,
        }
      : null,
  };
}

export async function getRegistrations(params: {
  scope?: string;
  search?: string;
  programFilter?: string;
  tagFilter?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    scope = "active",
    search,
    programFilter,
    tagFilter,
    page = 1,
    pageSize = 20,
  } = params;
  const requestedPage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 100);

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

  const total = await prisma.cCARegistration.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const skip = (safePage - 1) * safePageSize;

  const registrations = await prisma.cCARegistration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: safePageSize,
    select: {
      id: true,
      registerId: true,
      programId: true,
      fullName: true,
      nicNumber: true,
      passportNumber: true,
      emailAddress: true,
      whatsappNumber: true,
      paymentSlip: true,
      fullAmount: true,
      currentPaidAmount: true,
      createdAt: true,
      deletedAt: true,
      program: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });

  return s({
    data: registrations,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  });
}

const _cachedPrograms = unstable_cache(
  async () => {
    const programs: Array<{ code: string; name: string }> =
      await prisma.program.findMany({
        select: { code: true, name: true },
        orderBy: { displayOrder: "asc" },
      });
    return programs.map((p) => ({ programId: p.code, programName: p.name }));
  },
  ["active-programs"],
  { revalidate: 3600 },
);

export async function getActivePrograms() {
  return _cachedPrograms();
}

export async function toggleRegistrationTrash(id: number, restore: boolean) {
  const actor = await getAdminActorFromRequestHeaders();
  const before = await getRegistrationAuditSnapshot(id);

  try {
    await prisma.cCARegistration.update({
      where: { id: BigInt(id) },
      data: {
        deletedAt: restore ? null : new Date(),
      },
    });

    const after = await getRegistrationAuditSnapshot(id);
    await logActivitySafe({
      actor,
      category: "registration",
      action: restore ? "registration_restored" : "registration_trashed",
      status: "success",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before?.registerId || after?.registerId || String(id),
      message: restore
        ? "Registration restored from trash"
        : "Registration moved to trash",
      routeName: "/admin",
      beforeData: before,
      afterData: after,
    });
    revalidatePath("/admin");
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "registration",
      action: restore ? "registration_restore_failed" : "registration_trash_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before?.registerId || String(id),
      message: "Failed to toggle registration trash status",
      routeName: "/admin",
      beforeData: before,
      meta: {
        restore,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

export async function purgeRegistration(id: number) {
  const actor = await getAdminActorFromRequestHeaders();
  const before = await getRegistrationAuditSnapshot(id);

  try {
    await prisma.cCARegistration.delete({
      where: { id: BigInt(id) },
    });
    await logActivitySafe({
      actor,
      category: "registration",
      action: "registration_purged",
      status: "success",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before?.registerId || String(id),
      message: "Registration permanently deleted",
      routeName: "/admin",
      beforeData: before,
    });
    revalidatePath("/admin");
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "registration",
      action: "registration_purge_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before?.registerId || String(id),
      message: "Failed to permanently delete registration",
      routeName: "/admin",
      beforeData: before,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

export async function getRegistrationById(
  id: number,
  params?: {
    paymentsPage?: number;
    paymentsPageSize?: number;
    includePayments?: boolean;
  },
) {
  const includePayments = params?.includePayments ?? true;
  const requestedPaymentsPage = Math.max(1, params?.paymentsPage ?? 1);
  const safePaymentsPageSize = Math.min(
    Math.max(1, params?.paymentsPageSize ?? 20),
    100,
  );

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
    },
  });

  if (!registration) return null;

  let paymentsTotal = 0;
  let paymentsTotalPages = 1;
  let safePaymentsPage = 1;
  let calculatedPaidAmount = 0;
  let calculatedPaidTransactions = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payments: any[] = [];

  if (includePayments) {
    const [resolvedPaymentsTotal, activePaymentsTotal, paymentsTotalCount] =
      await Promise.all([
        prisma.registrationPayment.count({
          where: { ccaRegistrationId: BigInt(id) },
        }),
        prisma.registrationPayment.aggregate({
          where: {
            ccaRegistrationId: BigInt(id),
            status: "active",
          },
          _sum: { amount: true },
        }),
        prisma.registrationPayment.count({
          where: {
            ccaRegistrationId: BigInt(id),
            status: "active",
          },
        }),
      ]);

    paymentsTotal = resolvedPaymentsTotal;
    paymentsTotalPages = Math.max(
      1,
      Math.ceil(paymentsTotal / safePaymentsPageSize),
    );
    safePaymentsPage = Math.min(requestedPaymentsPage, paymentsTotalPages);
    const paymentsSkip = (safePaymentsPage - 1) * safePaymentsPageSize;

    payments = await prisma.registrationPayment.findMany({
      where: { ccaRegistrationId: BigInt(id) },
      orderBy: { createdAt: "desc" },
      skip: paymentsSkip,
      take: safePaymentsPageSize,
    });

    calculatedPaidAmount = Number(activePaymentsTotal._sum.amount || 0);
    calculatedPaidTransactions = paymentsTotalCount;
  }

  return s({
    ...registration,
    payments,
    paymentsPage: safePaymentsPage,
    paymentsPageSize: safePaymentsPageSize,
    paymentsTotal,
    paymentsTotalPages,
    calculatedPaidAmount,
    calculatedPaidTransactions,
    programName: registration.program?.name ?? null,
    programYear: registration.program?.yearLabel ?? null,
    programDuration: registration.program?.durationLabel ?? null,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRegistration(id: number, data: any) {
  const actor = await getAdminActorFromRequestHeaders();
  const before = await getRegistrationAuditSnapshot(id);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentPaidAmount,
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

  // Normalize enum fields to lowercase to match Prisma schema
  if (updateData.highestQualification)
    updateData.highestQualification = String(
      updateData.highestQualification,
    ).toLowerCase();
  if (updateData.qualificationStatus)
    updateData.qualificationStatus = String(
      updateData.qualificationStatus,
    ).toLowerCase();
  if (updateData.gender)
    updateData.gender = String(updateData.gender).toLowerCase();

  try {
    const updated = await prisma.cCARegistration.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    await logActivitySafe({
      actor,
      category: "registration",
      action: "registration_updated",
      status: "success",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: updated.registerId,
      message: "Registration profile updated by admin",
      routeName: `/admin/registrations/${id}/edit`,
      beforeData: before,
      afterData: {
        id: updated.id,
        registerId: updated.registerId,
        fullName: updated.fullName,
        programId: updated.programId,
        emailAddress: updated.emailAddress,
        whatsappNumber: updated.whatsappNumber,
        fullAmount: updated.fullAmount,
        currentPaidAmount: updated.currentPaidAmount,
        updatedAt: updated.updatedAt,
      },
      meta: {
        changedKeys: Object.keys(updateData),
      },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/registrations/${id}`);
    return { success: true, registration: s(updated) };
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "registration",
      action: "registration_update_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before?.registerId || String(id),
      message: "Failed to update registration profile",
      routeName: `/admin/registrations/${id}/edit`,
      beforeData: before,
      meta: {
        changedKeys: Object.keys(updateData),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}
