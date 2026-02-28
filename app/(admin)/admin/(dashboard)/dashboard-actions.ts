"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_cache } from "next/cache";

function s<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}

const _cachedDashboardStats = unstable_cache(
  async () => {
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
  },
  ["dashboard-stats"],
  { revalidate: 60 },
);

export async function getDashboardStats() {
  return _cachedDashboardStats();
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

export async function getRegistrationById(
  id: number,
  params?: {
    paymentsPage?: number;
    paymentsPageSize?: number;
  },
) {
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

  const [paymentsTotal, activePaymentsTotal, paymentsTotalCount] =
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

  const paymentsTotalPages = Math.max(
    1,
    Math.ceil(paymentsTotal / safePaymentsPageSize),
  );
  const safePaymentsPage = Math.min(requestedPaymentsPage, paymentsTotalPages);
  const paymentsSkip = (safePaymentsPage - 1) * safePaymentsPageSize;

  const payments = await prisma.registrationPayment.findMany({
    where: { ccaRegistrationId: BigInt(id) },
    orderBy: { createdAt: "desc" },
    skip: paymentsSkip,
    take: safePaymentsPageSize,
  });

  return s({
    ...registration,
    payments,
    paymentsPage: safePaymentsPage,
    paymentsPageSize: safePaymentsPageSize,
    paymentsTotal,
    paymentsTotalPages,
    calculatedPaidAmount: Number(activePaymentsTotal._sum.amount || 0),
    calculatedPaidTransactions: paymentsTotalCount,
    programName: registration.program?.name ?? null,
    programYear: registration.program?.yearLabel ?? null,
    programDuration: registration.program?.durationLabel ?? null,
  });
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

  const updated = await prisma.cCARegistration.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/registrations/${id}`);
  return { success: true, registration: s(updated) };
}
