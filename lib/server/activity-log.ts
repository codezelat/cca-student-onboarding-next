import "server-only";

import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const MAX_LOG_STRING_LENGTH = 1200;
const MAX_RECURSION_DEPTH = 4;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 100;

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /set-cookie/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /recaptcha/i,
  /turnstile/i,
  /captcha/i,
];

type BigIntLike = bigint | number | string | null | undefined;

export type ActivityActor = {
  userId?: BigIntLike;
  name?: string | null;
  email?: string | null;
};

export type ActivityLogInput = {
  actor?: ActivityActor | null;
  category: string;
  action: string;
  status?: string;
  subjectType?: string | null;
  subjectId?: BigIntLike;
  subjectLabel?: string | null;
  message?: string | null;
  routeName?: string | null;
  httpMethod?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  meta?: unknown;
};

export type ActivityRequestContext = {
  routeName?: string;
  httpMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

let activityTableInitPromise: Promise<void> | null = null;

function normalizeBigInt(value: BigIntLike): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isInteger(value)) return null;
    return BigInt(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^-?\d+$/.test(trimmed)) return null;
    return BigInt(trimmed);
  }
  return null;
}

function normalizeHeaderValue(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function truncate(value: string | null | undefined, maxLength = 255): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function normalizeUnknown(value: unknown): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_k, item) => {
      if (typeof item === "bigint") return item.toString();
      if (item instanceof Date) return item.toISOString();
      if (item instanceof Prisma.Decimal) return item.toString();
      return item;
    }),
  );
}

function sanitizeValue(
  value: unknown,
  depth: number,
  keyHint?: string,
): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (keyHint && shouldRedactKey(keyHint)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    if (value.length > MAX_LOG_STRING_LENGTH) {
      return `${value.slice(0, MAX_LOG_STRING_LENGTH - 1)}…`;
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (depth >= MAX_RECURSION_DEPTH) {
    return "[TRUNCATED]";
  }

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    const limit = Math.min(value.length, MAX_ARRAY_ITEMS);
    for (let i = 0; i < limit; i += 1) {
      const sanitized = sanitizeValue(value[i], depth + 1);
      out.push(sanitized ?? null);
    }
    if (value.length > MAX_ARRAY_ITEMS) {
      out.push(`[+${value.length - MAX_ARRAY_ITEMS} more items]`);
    }
    return out;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>);
    const limit = Math.min(entries.length, MAX_OBJECT_KEYS);
    for (let i = 0; i < limit; i += 1) {
      const [key, val] = entries[i];
      const sanitized = sanitizeValue(val, depth + 1, key);
      out[key] = sanitized ?? null;
    }
    if (entries.length > MAX_OBJECT_KEYS) {
      out.__truncated_keys = `+${entries.length - MAX_OBJECT_KEYS}`;
    }
    return out;
  }

  return String(value);
}

function sanitizeForLog(value: unknown): Prisma.InputJsonValue | undefined {
  const normalized = normalizeUnknown(value);
  const sanitized = sanitizeValue(normalized, 0);
  if (sanitized === undefined) return undefined;
  return sanitized as Prisma.InputJsonValue;
}

export async function ensureActivityLogTable(): Promise<void> {
  if (!activityTableInitPromise) {
    activityTableInitPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS admin_activity_logs (
          id BIGSERIAL PRIMARY KEY,
          actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
          actor_name_snapshot TEXT NULL,
          actor_email_snapshot TEXT NULL,
          category TEXT NOT NULL DEFAULT 'general',
          action TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'success',
          subject_type TEXT NULL,
          subject_id BIGINT NULL,
          subject_label TEXT NULL,
          message TEXT NULL,
          route_name TEXT NULL,
          http_method TEXT NULL,
          ip_address TEXT NULL,
          user_agent TEXT NULL,
          request_id TEXT NULL,
          before_data JSONB NULL,
          after_data JSONB NULL,
          meta JSONB NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at
        ON admin_activity_logs (created_at DESC)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_actor_user_id
        ON admin_activity_logs (actor_user_id)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_category
        ON admin_activity_logs (category)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action
        ON admin_activity_logs (action)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_status
        ON admin_activity_logs (status)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_subject
        ON admin_activity_logs (subject_type, subject_id)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_request_id
        ON admin_activity_logs (request_id)
      `);
    })();
  }

  await activityTableInitPromise;
}

export function getRequestContext(request: Request): ActivityRequestContext {
  const url = new URL(request.url);
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || undefined;
  const userAgent = request.headers.get("user-agent") || undefined;
  const requestId =
    request.headers.get("x-request-id") ||
    request.headers.get("cf-ray") ||
    crypto.randomUUID();

  return {
    routeName: url.pathname,
    httpMethod: request.method,
    ipAddress,
    userAgent,
    requestId,
  };
}

export function extractAdminActorFromHeaders(headersLike: Headers): ActivityActor {
  return {
    userId: headersLike.get("x-admin-user-id"),
    name: normalizeHeaderValue(headersLike.get("x-admin-user-name")) || null,
    email: normalizeHeaderValue(headersLike.get("x-admin-user-email")) || null,
  };
}

export function extractAdminActorFromRequest(request: Request): ActivityActor {
  return extractAdminActorFromHeaders(request.headers);
}

export async function getAdminActorFromRequestHeaders(): Promise<ActivityActor> {
  const headerStore = await headers();
  return extractAdminActorFromHeaders(headerStore);
}

export async function logActivity(input: ActivityLogInput): Promise<void> {
  await ensureActivityLogTable();

  const actorUserId = normalizeBigInt(input.actor?.userId);
  const beforeData = sanitizeForLog(input.beforeData);
  const afterData = sanitizeForLog(input.afterData);
  const meta = sanitizeForLog(input.meta);

  await prisma.adminActivityLog.create({
    data: {
      actorUserId,
      actorNameSnapshot: truncate(input.actor?.name ?? null, 180),
      actorEmailSnapshot: truncate(input.actor?.email ?? null, 320),
      category: truncate(input.category, 60) ?? "general",
      action: truncate(input.action, 120) ?? "unknown",
      status: truncate(input.status || "success", 40) ?? "success",
      subjectType: truncate(input.subjectType ?? null, 80),
      subjectId: normalizeBigInt(input.subjectId),
      subjectLabel: truncate(input.subjectLabel ?? null, 240),
      message: truncate(input.message ?? null, 1000),
      routeName: truncate(input.routeName ?? null, 240),
      httpMethod: truncate(input.httpMethod?.toUpperCase() ?? null, 10),
      ipAddress: truncate(input.ipAddress ?? null, 100),
      userAgent: truncate(input.userAgent ?? null, 600),
      requestId: truncate(input.requestId ?? null, 120),
      ...(beforeData !== undefined ? { beforeData } : {}),
      ...(afterData !== undefined ? { afterData } : {}),
      ...(meta !== undefined ? { meta } : {}),
    },
  });
}

export async function logActivitySafe(input: ActivityLogInput): Promise<void> {
  try {
    await logActivity(input);
  } catch (error) {
    console.error("Failed to persist admin activity log:", error);
  }
}
