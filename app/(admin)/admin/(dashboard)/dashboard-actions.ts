"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fileUpload } from "@/lib/services/file-upload";
import { revalidatePath, unstable_cache } from "next/cache";
import {
  getAdminActorFromRequestHeaders,
  logActivitySafe,
} from "@/lib/server/activity-log";
import {
  assertAdminFromServerHeaders,
} from "@/lib/server/admin-auth";
import {
  DOCUMENT_CATEGORIES,
  extractStorageKeyFromPublicUrl,
  normalizeNicDocumentSide,
  normalizeDocumentCollection,
  normalizeDocumentEntry,
  type RegistrationDocumentCategory,
  type RegistrationDocumentEntry,
} from "@/lib/registration-documents";
import {
  DEFAULT_REGISTRATION_EXPORT_FIELD_KEYS,
  REGISTRATION_EXPORT_FIELD_KEYS,
  getOrderedRegistrationExportFields,
  type RegistrationExportDataKey,
  type RegistrationExportFieldKey,
} from "@/lib/registration-export";

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
      academicQualificationDocuments: true,
      nicDocuments: true,
      passportDocuments: true,
      passportPhoto: true,
      paymentSlip: true,
    },
  });
}

type RegistrationQueryFilters = {
  scope?: string;
  search?: string;
  programFilter?: string;
  tagFilter?: string;
};

function buildRegistrationWhere(filters: RegistrationQueryFilters) {
  const { scope = "active", search, programFilter, tagFilter } = filters;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (scope === "active") {
    where.deletedAt = null;
  } else if (scope === "trashed") {
    where.NOT = { deletedAt: null };
  }

  if (search) {
    where.OR = [
      { registerId: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
      { emailAddress: { contains: search, mode: "insensitive" } },
      { nicNumber: { contains: search, mode: "insensitive" } },
      { whatsappNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  if (programFilter) {
    where.programId = programFilter;
  }

  if (tagFilter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.tags = { path: [], array_contains: tagFilter } as any;
  }

  return where;
}

function normalizeRegistrationDocuments<T extends Record<string, unknown>>(registration: T): T {
  const normalized = {
    ...registration,
    academicQualificationDocuments: normalizeDocumentCollection(
      registration.academicQualificationDocuments,
    ),
    nicDocuments: normalizeDocumentCollection(registration.nicDocuments),
    passportDocuments: normalizeDocumentCollection(registration.passportDocuments),
    passportPhoto: normalizeDocumentCollection(registration.passportPhoto),
    paymentSlip: normalizeDocumentCollection(registration.paymentSlip),
  };

  return normalized as T;
}

function toNullableTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseRequiredDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} is invalid.`);
  }
  return date;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Provided date value is invalid.");
  }
  return date;
}

function parseOptionalAmount(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Full amount must be a valid non-negative number.");
    }
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Full amount must be a valid non-negative number.");
  }
  return parsed;
}

function buildDocumentFieldUpdate(
  category: RegistrationDocumentCategory,
  documents: RegistrationDocumentEntry[],
): Prisma.CCARegistrationUpdateInput {
  return {
    [category]: documents as unknown as Prisma.InputJsonValue,
  } as Prisma.CCARegistrationUpdateInput;
}

const registrationProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  nameWithInitials: z.string().trim().min(2).max(100),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.string().trim().min(1),
  nicNumber: z.string().trim().max(80).nullable().optional(),
  passportNumber: z.string().trim().max(80).nullable().optional(),
  nationality: z.string().trim().min(2).max(100),
  countryOfBirth: z.string().trim().min(2).max(100),
  emailAddress: z.string().trim().email().max(320),
  whatsappNumber: z.string().trim().min(5).max(30),
  homeContactNumber: z.string().trim().max(30).nullable().optional(),
  permanentAddress: z.string().trim().min(5).max(400),
  district: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(2).max(100),
  guardianContactName: z.string().trim().min(2).max(150),
  guardianContactNumber: z.string().trim().min(5).max(30),
  highestQualification: z.enum([
    "degree",
    "diploma",
    "postgraduate",
    "msc",
    "phd",
    "work_experience",
    "other",
  ]),
  qualificationStatus: z.enum(["completed", "ongoing"]),
  qualificationCompletedDate: z.string().trim().nullable().optional(),
  qualificationExpectedCompletionDate: z.string().trim().nullable().optional(),
  programId: z.string().trim().min(1).max(50),
  programName: z.string().trim().min(1).max(200),
  programYear: z.string().trim().min(1).max(120),
  programDuration: z.string().trim().min(1).max(120),
  fullAmount: z.union([z.string(), z.number(), z.null()]).optional(),
});

const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

const documentAppendInputSchema = z.array(
  z.object({
    url: z.string().trim().min(1).max(2048),
    key: z.string().trim().max(1024).nullable().optional(),
    filename: z.string().trim().max(512).nullable().optional(),
    contentType: z.string().trim().max(255).nullable().optional(),
    fileSize: z.number().int().positive().nullable().optional(),
    uploadedAt: z.string().trim().nullable().optional(),
    source: z.string().trim().max(80).nullable().optional(),
    side: z.enum(["front", "back"]).nullable().optional(),
  }),
);

const registrationExportFieldSchema = z
  .array(z.enum(REGISTRATION_EXPORT_FIELD_KEYS))
  .min(1)
  .max(REGISTRATION_EXPORT_FIELD_KEYS.length);

function buildRegistrationExportSelect(
  dataKeys: Iterable<RegistrationExportDataKey>,
): Prisma.CCARegistrationSelect {
  const select = {} as Prisma.CCARegistrationSelect;

  for (const key of dataKeys) {
    select[key] = true;
  }

  return select;
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
  const where = buildRegistrationWhere({
    scope,
    search,
    programFilter,
    tagFilter,
  });

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

  const normalizedRegistrations = registrations.map((registration) => ({
    ...registration,
    paymentSlip: normalizeDocumentCollection(registration.paymentSlip),
  }));

  return s({
    data: normalizedRegistrations,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  });
}

export async function getRegistrationsForExport(
  params: RegistrationQueryFilters = {},
  selectedFieldsInput?: unknown,
) {
  await assertAdminFromServerHeaders();
  const where = buildRegistrationWhere(params);
  const selectedFieldsParse = registrationExportFieldSchema.safeParse(
    selectedFieldsInput ?? DEFAULT_REGISTRATION_EXPORT_FIELD_KEYS,
  );

  if (!selectedFieldsParse.success) {
    throw new Error("Invalid export field selection.");
  }

  const orderedFields = getOrderedRegistrationExportFields(
    selectedFieldsParse.data as RegistrationExportFieldKey[],
  );
  const requiredDataKeys = new Set<RegistrationExportDataKey>();

  orderedFields.forEach((field) => {
    field.dataKeys.forEach((dataKey) => {
      requiredDataKeys.add(dataKey);
    });
  });

  const registrations = await prisma.cCARegistration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: buildRegistrationExportSelect(requiredDataKeys),
  });

  return s(registrations);
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
  await assertAdminFromServerHeaders();
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
  await assertAdminFromServerHeaders();
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

  const normalizedRegistration = normalizeRegistrationDocuments(registration);

  let paymentsTotal = 0;
  let paymentsTotalPages = 1;
  let safePaymentsPage = 1;
  let calculatedPaidAmount = 0;
  let calculatedPaidTransactions = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payments: any[] = [];

  if (includePayments) {
    const [
      resolvedPaymentsTotal,
      activePaymentsTotal,
      deductionPaymentsTotal,
      paymentsTotalCount,
    ] =
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
        prisma.registrationPayment.aggregate({
          where: {
            ccaRegistrationId: BigInt(id),
            status: "void",
            voidedAt: null,
          },
          _sum: { amount: true },
        }),
        prisma.registrationPayment.count({
          where: {
            ccaRegistrationId: BigInt(id),
            OR: [
              { status: "active" },
              {
                status: "void",
                voidedAt: null,
              },
            ],
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

    calculatedPaidAmount =
      Number(activePaymentsTotal._sum.amount || 0) -
      Number(deductionPaymentsTotal._sum.amount || 0);
    calculatedPaidTransactions = paymentsTotalCount;
  }

  return s({
    ...normalizedRegistration,
    payments,
    paymentsPage: safePaymentsPage,
    paymentsPageSize: safePaymentsPageSize,
    paymentsTotal,
    paymentsTotalPages,
    calculatedPaidAmount,
    calculatedPaidTransactions,
    programName: normalizedRegistration.program?.name ?? null,
    programYear: normalizedRegistration.program?.yearLabel ?? null,
    programDuration: normalizedRegistration.program?.durationLabel ?? null,
  });
}

export async function updateRegistrationProfile(id: number, data: unknown) {
  await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  const before = await getRegistrationAuditSnapshot(id);

  const parsed = registrationProfileUpdateSchema.safeParse(data);
  if (!parsed.success) {
    await logActivitySafe({
      actor,
      category: "registration",
      action: "registration_update_validation_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before?.registerId || String(id),
      message: "Registration profile update rejected due to invalid input",
      routeName: `/admin/registrations/${id}/edit`,
      meta: {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return { success: false, error: "Invalid registration update payload." };
  }

  const payload = parsed.data;
  const normalizedProgramCode = payload.programId.toUpperCase();
  const matchingProgram = await prisma.program.findFirst({
    where: {
      code: {
        equals: normalizedProgramCode,
        mode: "insensitive",
      },
    },
    select: {
      code: true,
      name: true,
    },
  });

  if (!matchingProgram) {
    return { success: false, error: "Selected program is invalid." };
  }

  let fullAmount: number | null;
  try {
    fullAmount = parseOptionalAmount(payload.fullAmount);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid amount.",
    };
  }

  let dateOfBirth: Date;
  let qualificationCompletedDate: Date | null;
  let qualificationExpectedCompletionDate: Date | null;
  try {
    dateOfBirth = parseRequiredDate(payload.dateOfBirth, "Date of birth");
    qualificationCompletedDate = parseOptionalDate(
      toNullableTrimmed(payload.qualificationCompletedDate),
    );
    qualificationExpectedCompletionDate = parseOptionalDate(
      toNullableTrimmed(payload.qualificationExpectedCompletionDate),
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid date value.",
    };
  }

  const updateData: Prisma.CCARegistrationUpdateInput = {
    fullName: payload.fullName,
    nameWithInitials: payload.nameWithInitials,
    gender: payload.gender,
    dateOfBirth,
    nicNumber: toNullableTrimmed(payload.nicNumber),
    passportNumber: toNullableTrimmed(payload.passportNumber),
    nationality: payload.nationality,
    countryOfBirth: payload.countryOfBirth,
    emailAddress: payload.emailAddress,
    whatsappNumber: payload.whatsappNumber,
    homeContactNumber: toNullableTrimmed(payload.homeContactNumber),
    permanentAddress: payload.permanentAddress,
    district: toNullableTrimmed(payload.district),
    postalCode: payload.postalCode,
    country: payload.country,
    guardianContactName: payload.guardianContactName,
    guardianContactNumber: payload.guardianContactNumber,
    highestQualification: payload.highestQualification,
    qualificationStatus: payload.qualificationStatus,
    qualificationCompletedDate,
    qualificationExpectedCompletionDate,
    program: {
      connect: {
        code: matchingProgram.code,
      },
    },
    programName: matchingProgram.name,
    programYear: payload.programYear,
    programDuration: payload.programDuration,
    fullAmount,
  };

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
    revalidatePath(`/admin/registrations/${id}/edit`);
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
    return { success: false, error: "Failed to update registration profile." };
  }
}

export async function appendRegistrationDocuments(
  id: number,
  categoryInput: unknown,
  documentsInput: unknown,
) {
  const admin = await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  const categoryParse = documentCategorySchema.safeParse(categoryInput);
  if (!categoryParse.success) {
    return { success: false, error: "Invalid document category." };
  }
  const category = categoryParse.data;

  const documentsParse = documentAppendInputSchema.safeParse(documentsInput);
  if (!documentsParse.success || !documentsParse.data.length) {
    return { success: false, error: "No valid document metadata provided." };
  }

  if (
    category === "nicDocuments" &&
    documentsParse.data.some((document) => !normalizeNicDocumentSide(document.side))
  ) {
    return {
      success: false,
      error: "NIC uploads must specify a side (front or back).",
    };
  }

  const before = await prisma.cCARegistration.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      registerId: true,
      academicQualificationDocuments: true,
      nicDocuments: true,
      passportDocuments: true,
      passportPhoto: true,
      paymentSlip: true,
    },
  });

  if (!before) {
    return { success: false, error: "Registration not found." };
  }

  const existingDocuments = normalizeDocumentCollection(before[category]);
  const preparedDocuments = documentsParse.data
    .map((document, index) => {
      const side =
        category === "nicDocuments"
          ? normalizeNicDocumentSide(document.side)
          : undefined;

      return normalizeDocumentEntry(
        {
          url: document.url,
          key: toNullableTrimmed(document.key),
          filename: toNullableTrimmed(document.filename),
          contentType: toNullableTrimmed(document.contentType),
          sizeBytes: document.fileSize ?? undefined,
          uploadedAt: toNullableTrimmed(document.uploadedAt) ?? new Date().toISOString(),
          source: toNullableTrimmed(document.source) ?? "admin",
          uploadedBy: admin.userId,
          side,
        },
        {
          fallbackMs: Date.now() + index,
        },
      );
    })
    .filter((entry): entry is RegistrationDocumentEntry => Boolean(entry));

  if (!preparedDocuments.length) {
    return { success: false, error: "Uploaded document URLs are invalid or unsafe." };
  }

  const mergedDocuments = normalizeDocumentCollection([
    ...existingDocuments,
    ...preparedDocuments,
  ]);

  try {
    await prisma.cCARegistration.update({
      where: { id: BigInt(id) },
      data: buildDocumentFieldUpdate(category, mergedDocuments),
    });

    await logActivitySafe({
      actor,
      category: "registration_document",
      action: "registration_documents_appended",
      status: "success",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before.registerId,
      message: "Admin appended registration documents",
      routeName: `/admin/registrations/${id}/edit`,
      meta: {
        category,
        addedCount: preparedDocuments.length,
        totalCount: mergedDocuments.length,
      },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/registrations/${id}`);
    revalidatePath(`/admin/registrations/${id}/edit`);
    return { success: true, documents: s(mergedDocuments) };
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "registration_document",
      action: "registration_documents_append_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before.registerId,
      message: "Failed to append registration documents",
      routeName: `/admin/registrations/${id}/edit`,
      meta: {
        category,
        attemptedCount: preparedDocuments.length,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return { success: false, error: "Failed to append registration documents." };
  }
}

export async function hardDeleteRegistrationDocument(
  id: number,
  categoryInput: unknown,
  documentIdInput: unknown,
) {
  await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  const categoryParse = documentCategorySchema.safeParse(categoryInput);
  if (!categoryParse.success) {
    return { success: false, error: "Invalid document category." };
  }
  const category = categoryParse.data;

  const documentId = toNullableTrimmed(documentIdInput);
  if (!documentId) {
    return { success: false, error: "Invalid document identifier." };
  }

  const before = await prisma.cCARegistration.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      registerId: true,
      academicQualificationDocuments: true,
      nicDocuments: true,
      passportDocuments: true,
      passportPhoto: true,
      paymentSlip: true,
    },
  });

  if (!before) {
    return { success: false, error: "Registration not found." };
  }

  const existingDocuments = normalizeDocumentCollection(before[category]);
  const documentToDelete = existingDocuments.find((entry) => entry.id === documentId);
  if (!documentToDelete) {
    return { success: false, error: "Document not found." };
  }

  const nextDocuments = existingDocuments.filter((entry) => entry.id !== documentId);
  let deletedStorageKey: string | null = null;
  let storageDeleteError: string | null = null;

  try {
    await prisma.cCARegistration.update({
      where: { id: BigInt(id) },
      data: buildDocumentFieldUpdate(category, nextDocuments),
    });

    const detectedStorageKey =
      toNullableTrimmed(documentToDelete.key) ||
      extractStorageKeyFromPublicUrl(documentToDelete.url, process.env.R2_PUBLIC_URL);

    if (detectedStorageKey) {
      deletedStorageKey = detectedStorageKey;
      try {
        await fileUpload.delete(detectedStorageKey);
      } catch (error) {
        storageDeleteError =
          error instanceof Error ? error.message : "Failed to delete storage object.";
      }
    }

    await logActivitySafe({
      actor,
      category: "registration_document",
      action: "registration_document_deleted",
      status: "success",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before.registerId,
      message: "Admin removed registration document history entry",
      routeName: `/admin/registrations/${id}/edit`,
      meta: {
        category,
        documentId,
        deletedStorageKey,
        storageDeleteError,
      },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/registrations/${id}`);
    revalidatePath(`/admin/registrations/${id}/edit`);
    return {
      success: true,
      documents: s(nextDocuments),
      warning: storageDeleteError
        ? "Document removed from database, but storage deletion failed."
        : undefined,
    };
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "registration_document",
      action: "registration_document_delete_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: id,
      subjectLabel: before.registerId,
      message: "Failed to delete registration document",
      routeName: `/admin/registrations/${id}/edit`,
      meta: {
        category,
        documentId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return { success: false, error: "Failed to delete registration document." };
  }
}

export async function updateRegistration(id: number, data: unknown) {
  return updateRegistrationProfile(id, data);
}
