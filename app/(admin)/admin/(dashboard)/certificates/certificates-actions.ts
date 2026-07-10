"use server";

import {
  Prisma,
  type CertificateResult as PrismaCertificateResult,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdminFromServerHeaders } from "@/lib/server/admin-auth";
import {
  getAdminActorFromRequestHeaders,
  logActivitySafe,
} from "@/lib/server/activity-log";
import {
  CERTIFICATE_RESULT_VALUES,
  type CertificateResultValue,
} from "./certificate-options";

const CERTIFICATES_ROUTE = "/admin/certificates";
const PAGE_SIZE = 20;
const CERTIFICATE_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,79}$/;
const APP_TIME_ZONE = "Asia/Colombo";

export type CertificateStudentOption = {
  id: string;
  registerId: string;
  fullName: string;
  nicNumber: string | null;
  programId: string;
  programName: string;
  programYear: string;
  suggestedCertificateNumber: string | null;
};

export type CertificateListItem = {
  id: string;
  certificateNumber: string;
  isCustomNumber: boolean;
  result: CertificateResultValue;
  issuedAt: string;
  createdAt: string;
  programCodeSnapshot: string;
  programNameSnapshot: string;
  programYearSnapshot: string;
  moduleResults: CertificateModuleResultItem[];
  registration: CertificateStudentOption;
};

export type CertificateModuleOption = {
  id: string;
  code: string;
  name: string;
  creditValue: string | null;
};

export type CertificateModuleResultItem = CertificateModuleOption & {
  result: CertificateResultValue;
};

export type CertificateProgramOption = {
  code: string;
  name: string;
};

type CertificateResult = {
  data: CertificateListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const certificateModuleResultSchema = z.object({
  programModuleId: z.coerce.number().int().positive(),
  result: z.enum(CERTIFICATE_RESULT_VALUES),
});

const certificatePayloadSchema = z.object({
  registrationId: z.coerce.number().int().positive(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  result: z.enum(CERTIFICATE_RESULT_VALUES),
  moduleResults: z.array(certificateModuleResultSchema).max(100).default([]),
  useCustomNumber: z.boolean().optional(),
  certificateNumber: z.string().trim().max(80).optional(),
});

const certificateUpdateSchema = certificatePayloadSchema.extend({
  id: z.coerce.number().int().positive(),
});

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
}

function normalizeCertificateNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function buildCertificateNumber(
  registerId: string,
  nicNumber: string | null | undefined,
): string | null {
  const normalizedRegisterId = registerId
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const nicDigits = (nicNumber ?? "").replace(/\D/g, "");

  if (!normalizedRegisterId || !nicDigits) return null;
  return `${normalizedRegisterId}-${nicDigits}`;
}

function parseIssuedAt(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value > today
  ) {
    throw new Error("Enter a valid issue date.");
  }
  return date;
}

function getCustomCertificateNumber(value: string | undefined): string {
  const certificateNumber = normalizeCertificateNumber(value ?? "");
  if (!CERTIFICATE_NUMBER_PATTERN.test(certificateNumber)) {
    throw new Error("Use 3-80 uppercase letters, numbers, or hyphens.");
  }
  return certificateNumber;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toDatabaseUserId(value: unknown): bigint | null {
  const normalized =
    typeof value === "string" ? value.trim() : String(value ?? "");
  return /^\d+$/.test(normalized) ? BigInt(normalized) : null;
}

function toStudentOption(registration: {
  id: bigint;
  registerId: string;
  fullName: string;
  nicNumber: string | null;
  programId: string;
  programName: string;
  programYear: string;
}): CertificateStudentOption {
  return {
    id: String(registration.id),
    registerId: registration.registerId,
    fullName: registration.fullName,
    nicNumber: registration.nicNumber,
    programId: registration.programId,
    programName: registration.programName,
    programYear: registration.programYear,
    suggestedCertificateNumber: buildCertificateNumber(
      registration.registerId,
      registration.nicNumber,
    ),
  };
}

function toCertificateModuleOption(module: {
  id: bigint;
  code: string;
  name: string;
  creditValue: Prisma.Decimal | number | string | null;
}): CertificateModuleOption {
  return {
    id: String(module.id),
    code: module.code,
    name: module.name,
    creditValue:
      module.creditValue === null ? null : String(module.creditValue),
  };
}

function toCertificateModuleResultItem(moduleResult: {
  result: PrismaCertificateResult;
  moduleCodeSnapshot: string;
  moduleNameSnapshot: string;
  creditValueSnapshot: Prisma.Decimal | number | string | null;
  programModuleId: bigint;
}): CertificateModuleResultItem {
  return {
    id: String(moduleResult.programModuleId),
    code: moduleResult.moduleCodeSnapshot,
    name: moduleResult.moduleNameSnapshot,
    creditValue:
      moduleResult.creditValueSnapshot === null
        ? null
        : String(moduleResult.creditValueSnapshot),
    result: moduleResult.result as CertificateResultValue,
  };
}

function toCertificateListItem(certificate: {
  id: bigint;
  certificateNumber: string;
  isCustomNumber: boolean;
  result: PrismaCertificateResult;
  issuedAt: Date;
  createdAt: Date;
  programCodeSnapshot: string;
  programNameSnapshot: string;
  programYearSnapshot: string;
  moduleResults: Array<{
    result: PrismaCertificateResult;
    moduleCodeSnapshot: string;
    moduleNameSnapshot: string;
    creditValueSnapshot: Prisma.Decimal | number | string | null;
    programModuleId: bigint;
  }>;
  registration: {
    id: bigint;
    registerId: string;
    fullName: string;
    nicNumber: string | null;
    programId: string;
    programName: string;
    programYear: string;
  };
}): CertificateListItem {
  return {
    id: String(certificate.id),
    certificateNumber: certificate.certificateNumber,
    isCustomNumber: certificate.isCustomNumber,
    result: certificate.result as CertificateResultValue,
    issuedAt: certificate.issuedAt.toISOString(),
    createdAt: certificate.createdAt.toISOString(),
    programCodeSnapshot: certificate.programCodeSnapshot,
    programNameSnapshot: certificate.programNameSnapshot,
    programYearSnapshot: certificate.programYearSnapshot,
    moduleResults: certificate.moduleResults.map(toCertificateModuleResultItem),
    registration: toStudentOption(certificate.registration),
  };
}

async function getActiveProgramModules(programCode: string) {
  return prisma.programModule.findMany({
    where: {
      isActive: true,
      program: {
        code: { equals: programCode, mode: "insensitive" },
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      creditValue: true,
    },
    orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
  });
}

function validateModuleResults(
  modules: Array<{
    id: bigint;
    code: string;
    name: string;
    creditValue: Prisma.Decimal | null;
  }>,
  moduleResults: Array<{
    programModuleId: number;
    result: CertificateResultValue;
  }>,
) {
  if (modules.length === 0) {
    if (moduleResults.length > 0) {
      throw new Error("This program has no modules to record.");
    }
    return [];
  }

  const resultsByModuleId = new Map<bigint, CertificateResultValue>();
  for (const entry of moduleResults) {
    const moduleId = BigInt(entry.programModuleId);
    if (resultsByModuleId.has(moduleId)) {
      throw new Error("Each module can have only one result.");
    }
    resultsByModuleId.set(moduleId, entry.result);
  }

  if (resultsByModuleId.size !== modules.length) {
    throw new Error("Choose a result for every module.");
  }

  return modules.map((module) => {
    const result = resultsByModuleId.get(module.id);
    if (!result) throw new Error("Choose a result for every module.");
    return { module, result };
  });
}

async function getCertificateAuditSnapshot(id: bigint) {
  return prisma.certificate.findUnique({
    where: { id },
    select: {
      id: true,
      registrationId: true,
      certificateNumber: true,
      isCustomNumber: true,
      result: true,
      issuedAt: true,
      programCodeSnapshot: true,
      programNameSnapshot: true,
      programYearSnapshot: true,
      updatedAt: true,
      moduleResults: {
        select: {
          programModuleId: true,
          result: true,
          moduleCodeSnapshot: true,
          moduleNameSnapshot: true,
          creditValueSnapshot: true,
        },
      },
      registration: {
        select: {
          registerId: true,
          fullName: true,
          nicNumber: true,
          deletedAt: true,
        },
      },
    },
  });
}

export async function getCertificateModulesForRegistration(
  registrationIdInput: string,
): Promise<CertificateModuleOption[]> {
  await assertAdminFromServerHeaders();
  let registrationId: bigint;
  try {
    registrationId = BigInt(registrationIdInput);
  } catch {
    throw new Error("Invalid student.");
  }

  const registration = await prisma.cCARegistration.findUnique({
    where: { id: registrationId },
    select: { programId: true, deletedAt: true },
  });
  if (!registration || registration.deletedAt) {
    throw new Error("This student is not available for a certificate.");
  }

  const modules = await getActiveProgramModules(registration.programId);
  return modules.map(toCertificateModuleOption);
}

export async function getCertificateProgramOptions(): Promise<
  CertificateProgramOption[]
> {
  await assertAdminFromServerHeaders();
  const programs = await prisma.program.findMany({
    select: { code: true, name: true },
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
  return programs;
}

export async function getCertificates(params?: {
  search?: string;
  program?: string;
  result?: string;
  page?: number;
  pageSize?: number;
}): Promise<CertificateResult> {
  await assertAdminFromServerHeaders();
  const search = params?.search?.trim().slice(0, 120) ?? "";
  const program = params?.program?.trim().slice(0, 80).toUpperCase() ?? "";
  const result = params?.result?.trim().slice(0, 80) ?? "";
  const resultFilter = CERTIFICATE_RESULT_VALUES.includes(
    result as CertificateResultValue,
  )
    ? (result as PrismaCertificateResult)
    : null;
  const requestedPage = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(Math.max(1, params?.pageSize ?? PAGE_SIZE), 100);

  const where: Prisma.CertificateWhereInput = {
    registration: { deletedAt: null },
    ...(program
      ? { programCodeSnapshot: { equals: program, mode: "insensitive" } }
      : {}),
    ...(resultFilter ? { result: resultFilter } : {}),
    ...(search
      ? {
          OR: [
            { certificateNumber: { contains: search, mode: "insensitive" } },
            {
              registration: {
                is: {
                  OR: [
                    { registerId: { contains: search, mode: "insensitive" } },
                    { fullName: { contains: search, mode: "insensitive" } },
                    { nicNumber: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const total = await prisma.certificate.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const certificates = await prisma.certificate.findMany({
    where,
    include: {
      registration: {
        select: {
          id: true,
          registerId: true,
          fullName: true,
          nicNumber: true,
          programId: true,
          programName: true,
          programYear: true,
        },
      },
      moduleResults: {
        select: {
          programModuleId: true,
          result: true,
          moduleCodeSnapshot: true,
          moduleNameSnapshot: true,
          creditValueSnapshot: true,
        },
        orderBy: { moduleCodeSnapshot: "asc" },
      },
    },
    orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return serialize({
    data: certificates.map(toCertificateListItem),
    total,
    page,
    pageSize,
    totalPages,
  });
}

export async function searchCertificateStudents(
  query: string,
): Promise<CertificateStudentOption[]> {
  await assertAdminFromServerHeaders();
  const search = query.trim().slice(0, 80);
  if (search.length < 2) return [];

  const registrations = await prisma.cCARegistration.findMany({
    where: {
      deletedAt: null,
      certificate: null,
      OR: [
        { registerId: { contains: search, mode: "insensitive" } },
        { nicNumber: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      registerId: true,
      fullName: true,
      nicNumber: true,
      programId: true,
      programName: true,
      programYear: true,
    },
    orderBy: [{ registerId: "asc" }],
    take: 8,
  });

  return registrations.map(toStudentOption);
}

export async function createCertificate(input: unknown) {
  await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  const parsed = certificatePayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Check the certificate details and try again.");
  }

  const payload = parsed.data;
  const registrationId = BigInt(payload.registrationId);
  const registration = await prisma.cCARegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      registerId: true,
      fullName: true,
      nicNumber: true,
      programId: true,
      programName: true,
      programYear: true,
      deletedAt: true,
      certificate: { select: { id: true } },
    },
  });

  if (!registration || registration.deletedAt) {
    throw new Error("This student is not available for a certificate.");
  }
  if (registration.certificate) {
    throw new Error("A certificate already exists for this registration.");
  }
  const activeModules = await getActiveProgramModules(registration.programId);
  const validatedModuleResults = validateModuleResults(
    activeModules,
    payload.moduleResults,
  );

  let certificateNumber: string;
  try {
    certificateNumber = payload.useCustomNumber
      ? getCustomCertificateNumber(payload.certificateNumber)
      : (buildCertificateNumber(
          registration.registerId,
          registration.nicNumber,
        ) ??
        (() => {
          throw new Error(
            "This student needs a numeric NIC or a custom certificate ID.",
          );
        })());
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "certificate",
      action: "certificate_create_validation_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: registration.registerId,
      message: "Certificate creation rejected due to an invalid identifier",
      routeName: CERTIFICATES_ROUTE,
      meta: {
        error:
          error instanceof Error
            ? error.message
            : "Invalid certificate identifier",
      },
    });
    throw error;
  }

  try {
    const certificate = await prisma.certificate.create({
      data: {
        registrationId,
        certificateNumber,
        isCustomNumber: payload.useCustomNumber === true,
        result: payload.result as PrismaCertificateResult,
        issuedAt: parseIssuedAt(payload.issuedAt),
        programCodeSnapshot: registration.programId,
        programNameSnapshot: registration.programName,
        programYearSnapshot: registration.programYear,
        createdBy: toDatabaseUserId(actor.userId),
        updatedBy: toDatabaseUserId(actor.userId),
        moduleResults: {
          create: validatedModuleResults.map(({ module, result }) => ({
            programModuleId: module.id,
            result: result as PrismaCertificateResult,
            moduleCodeSnapshot: module.code,
            moduleNameSnapshot: module.name,
            creditValueSnapshot: module.creditValue,
          })),
        },
      },
      include: {
        registration: {
          select: {
            id: true,
            registerId: true,
            fullName: true,
            nicNumber: true,
            programId: true,
            programName: true,
            programYear: true,
          },
        },
        moduleResults: {
          select: {
            programModuleId: true,
            result: true,
            moduleCodeSnapshot: true,
            moduleNameSnapshot: true,
            creditValueSnapshot: true,
          },
          orderBy: { moduleCodeSnapshot: "asc" },
        },
      },
    });

    await logActivitySafe({
      actor,
      category: "certificate",
      action: "certificate_created",
      status: "success",
      subjectType: "Certificate",
      subjectId: certificate.id,
      subjectLabel: certificate.certificateNumber,
      message: "Certificate issued",
      routeName: CERTIFICATES_ROUTE,
      afterData: certificate,
    });
    revalidatePath(CERTIFICATES_ROUTE);
    return toCertificateListItem(certificate);
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "certificate",
      action: "certificate_create_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: registration.registerId,
      message: isUniqueConstraintError(error)
        ? "Certificate creation blocked by a duplicate certificate"
        : "Certificate creation failed",
      routeName: CERTIFICATES_ROUTE,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    if (isUniqueConstraintError(error)) {
      throw new Error(
        "That certificate ID or student already has a certificate.",
      );
    }
    throw error;
  }
}

export async function updateCertificate(input: unknown) {
  await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  const parsed = certificateUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Check the certificate details and try again.");
  }

  const payload = parsed.data;
  const id = BigInt(payload.id);
  const before = await getCertificateAuditSnapshot(id);
  if (!before) throw new Error("Certificate not found.");
  if (before.registration.deletedAt) {
    throw new Error("Restore the student before changing this certificate.");
  }
  const existingModuleResults = before.moduleResults.map((moduleResult) => ({
    id: moduleResult.programModuleId,
    code: moduleResult.moduleCodeSnapshot,
    name: moduleResult.moduleNameSnapshot,
    creditValue: moduleResult.creditValueSnapshot,
  }));
  const validatedModuleResults = validateModuleResults(
    existingModuleResults,
    payload.moduleResults,
  );

  try {
    const shouldUseCustomNumber = payload.useCustomNumber === true;
    const certificateNumber = shouldUseCustomNumber
      ? getCustomCertificateNumber(payload.certificateNumber)
      : before.isCustomNumber
        ? (buildCertificateNumber(
            before.registration.registerId,
            before.registration.nicNumber,
          ) ??
          (() => {
            throw new Error(
              "This student needs a numeric NIC for an automatic certificate ID.",
            );
          })())
        : before.certificateNumber;

    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        certificateNumber,
        isCustomNumber: shouldUseCustomNumber,
        result: payload.result as PrismaCertificateResult,
        issuedAt: parseIssuedAt(payload.issuedAt),
        updatedBy: toDatabaseUserId(actor.userId),
        ...(existingModuleResults.length > 0
          ? {
              moduleResults: {
                deleteMany: {},
                create: validatedModuleResults.map(({ module, result }) => ({
                  programModuleId: module.id,
                  result: result as PrismaCertificateResult,
                  moduleCodeSnapshot: module.code,
                  moduleNameSnapshot: module.name,
                  creditValueSnapshot: module.creditValue,
                })),
              },
            }
          : {}),
      },
      include: {
        registration: {
          select: {
            id: true,
            registerId: true,
            fullName: true,
            nicNumber: true,
            programId: true,
            programName: true,
            programYear: true,
          },
        },
        moduleResults: {
          select: {
            programModuleId: true,
            result: true,
            moduleCodeSnapshot: true,
            moduleNameSnapshot: true,
            creditValueSnapshot: true,
          },
          orderBy: { moduleCodeSnapshot: "asc" },
        },
      },
    });

    await logActivitySafe({
      actor,
      category: "certificate",
      action: "certificate_updated",
      status: "success",
      subjectType: "Certificate",
      subjectId: updated.id,
      subjectLabel: updated.certificateNumber,
      message: "Certificate updated",
      routeName: CERTIFICATES_ROUTE,
      beforeData: before,
      afterData: updated,
    });
    revalidatePath(CERTIFICATES_ROUTE);
    return toCertificateListItem(updated);
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "certificate",
      action: "certificate_update_failed",
      status: "failure",
      subjectType: "Certificate",
      subjectId: id,
      subjectLabel: before.certificateNumber,
      message: "Certificate update failed",
      routeName: CERTIFICATES_ROUTE,
      beforeData: before,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    if (isUniqueConstraintError(error)) {
      throw new Error("That certificate ID is already in use.");
    }
    throw error;
  }
}

export async function deleteCertificate(idInput: string) {
  await assertAdminFromServerHeaders();
  const actor = await getAdminActorFromRequestHeaders();
  let id: bigint;
  try {
    id = BigInt(idInput);
  } catch {
    throw new Error("Invalid certificate.");
  }

  const before = await getCertificateAuditSnapshot(id);
  if (!before) throw new Error("Certificate not found.");

  try {
    await prisma.certificate.delete({ where: { id } });
    await logActivitySafe({
      actor,
      category: "certificate",
      action: "certificate_deleted",
      status: "success",
      subjectType: "Certificate",
      subjectId: id,
      subjectLabel: before.certificateNumber,
      message: "Certificate deleted",
      routeName: CERTIFICATES_ROUTE,
      beforeData: before,
    });
    revalidatePath(CERTIFICATES_ROUTE);
  } catch (error) {
    await logActivitySafe({
      actor,
      category: "certificate",
      action: "certificate_delete_failed",
      status: "failure",
      subjectType: "Certificate",
      subjectId: id,
      subjectLabel: before.certificateNumber,
      message: "Certificate deletion failed",
      routeName: CERTIFICATES_ROUTE,
      beforeData: before,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    throw error;
  }
}
