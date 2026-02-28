"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureActivityLogTable } from "@/lib/server/activity-log";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
}

function parseDateBoundary(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const parsed = new Date(`${trimmed}${suffix}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export type ActivityQueryParams = {
  search?: string;
  category?: string;
  action?: string;
  status?: string;
  actor?: string;
  subjectType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type ActivityLogRow = {
  id: string;
  createdAt: string;
  category: string;
  action: string;
  status: string;
  actorNameSnapshot: string | null;
  actorEmailSnapshot: string | null;
  subjectType: string | null;
  subjectId: string | null;
  subjectLabel: string | null;
  message: string | null;
  routeName: string | null;
  httpMethod: string | null;
  requestId: string | null;
  ipAddress: string | null;
  beforeData: unknown;
  afterData: unknown;
  meta: unknown;
};

function buildActivityWhere(
  params: ActivityQueryParams,
): Prisma.AdminActivityLogWhereInput {
  const search = params.search?.trim() || "";
  const actor = params.actor?.trim() || "";
  const category = params.category?.trim() || "";
  const action = params.action?.trim() || "";
  const status = params.status?.trim() || "";
  const subjectType = params.subjectType?.trim() || "";
  const dateFrom = parseDateBoundary(params.dateFrom, false);
  const dateTo = parseDateBoundary(params.dateTo, true);

  const where: Prisma.AdminActivityLogWhereInput = {};
  const andFilters: Prisma.AdminActivityLogWhereInput[] = [];

  if (category && category !== "all") {
    where.category = category;
  }
  if (action && action !== "all") {
    where.action = action;
  }
  if (status && status !== "all") {
    where.status = status;
  }
  if (subjectType && subjectType !== "all") {
    where.subjectType = subjectType;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  if (actor) {
    andFilters.push({
      OR: [
        { actorNameSnapshot: { contains: actor, mode: "insensitive" } },
        { actorEmailSnapshot: { contains: actor, mode: "insensitive" } },
      ],
    });
  }

  if (search) {
    andFilters.push({
      OR: [
        { action: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { subjectType: { contains: search, mode: "insensitive" } },
        { subjectLabel: { contains: search, mode: "insensitive" } },
        { routeName: { contains: search, mode: "insensitive" } },
        { requestId: { contains: search, mode: "insensitive" } },
        { actorNameSnapshot: { contains: search, mode: "insensitive" } },
        { actorEmailSnapshot: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

type AdminActivityLogRecord = Awaited<
  ReturnType<typeof prisma.adminActivityLog.findMany>
>[number];

function mapActivityRows(rows: AdminActivityLogRecord[]): ActivityLogRow[] {
  return rows.map((row) => ({
    id: row.id.toString(),
    createdAt: row.createdAt.toISOString(),
    category: row.category,
    action: row.action,
    status: row.status,
    actorNameSnapshot: row.actorNameSnapshot,
    actorEmailSnapshot: row.actorEmailSnapshot,
    subjectType: row.subjectType,
    subjectId: row.subjectId ? row.subjectId.toString() : null,
    subjectLabel: row.subjectLabel,
    message: row.message,
    routeName: row.routeName,
    httpMethod: row.httpMethod,
    requestId: row.requestId,
    ipAddress: row.ipAddress,
    beforeData: serialize(row.beforeData),
    afterData: serialize(row.afterData),
    meta: serialize(row.meta),
  }));
}

export async function getActivityLogs(params: ActivityQueryParams) {
  await ensureActivityLogTable();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 25), 100);
  const where = buildActivityWhere(params);

  const total = await prisma.adminActivityLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const [rows, categories, actions, statuses, subjectTypes, totalLogs, failureLogs, last24hLogs, uniqueActorsRows] =
    await Promise.all([
      prisma.adminActivityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.adminActivityLog.findMany({
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
      prisma.adminActivityLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
      prisma.adminActivityLog.findMany({
        distinct: ["status"],
        select: { status: true },
        orderBy: { status: "asc" },
      }),
      prisma.adminActivityLog.findMany({
        where: { subjectType: { not: null } },
        distinct: ["subjectType"],
        select: { subjectType: true },
        orderBy: { subjectType: "asc" },
      }),
      prisma.adminActivityLog.count(),
      prisma.adminActivityLog.count({
        where: {
          status: { in: ["failure", "error", "blocked"] },
        },
      }),
      prisma.adminActivityLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT
          COUNT(DISTINCT actor_key)::bigint AS total
        FROM (
          SELECT
            NULLIF(COALESCE(actor_email_snapshot, actor_name_snapshot), '') AS actor_key
          FROM admin_activity_logs
        ) AS actors
        WHERE actor_key IS NOT NULL
      `,
    ]);

  const uniqueActors = Number(uniqueActorsRows[0]?.total ?? BigInt(0));
  const data = mapActivityRows(rows);

  return {
    data,
    total,
    page: safePage,
    pageSize,
    totalPages,
    filters: {
      categories: categories.map((entry) => entry.category).filter(Boolean),
      actions: actions.map((entry) => entry.action).filter(Boolean),
      statuses: statuses.map((entry) => entry.status).filter(Boolean),
      subjectTypes: subjectTypes
        .map((entry) => entry.subjectType)
        .filter((entry): entry is string => Boolean(entry)),
    },
    stats: {
      totalLogs,
      failureLogs,
      last24hLogs,
      uniqueActors,
    },
  };
}

export async function getActivityLogsForExport(
  params: ActivityQueryParams = {},
) {
  await ensureActivityLogTable();
  const where = buildActivityWhere(params);
  const rows = await prisma.adminActivityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return mapActivityRows(rows);
}
