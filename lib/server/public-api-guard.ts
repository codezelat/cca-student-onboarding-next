import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";

type RateLimitOptions = {
  request: Request;
  route: string;
  limit: number;
  windowSeconds: number;
};

type BeginIdempotencyOptions = {
  request: Request;
  route: string;
  requestHash: string;
  idempotencyKey?: string | null;
  ttlSeconds?: number;
  inProgressTimeoutSeconds?: number;
};

type BeginIdempotencyResult =
  | { kind: "proceed"; key: string }
  | {
      kind: "replay";
      key: string;
      httpStatus: number;
      responseBody: unknown;
    }
  | { kind: "in_progress"; key: string; message: string }
  | { kind: "conflict"; key: string; message: string };

const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_IN_PROGRESS_TIMEOUT_SECONDS = 45;

let guardsInitPromise: Promise<void> | null = null;
let cleanupCounter = 0;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`,
  );
  return `{${pairs.join(",")}}`;
}

export function createRequestHash(payload: unknown): string {
  return hashValue(stableStringify(payload));
}

function getClientIdentity(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip =
    forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "unknown-ip";
  const userAgent = request.headers.get("user-agent") || "unknown-ua";
  return hashValue(`${ip}|${userAgent}`).slice(0, 40);
}

async function ensureGuardTables(): Promise<void> {
  if (!guardsInitPromise) {
    guardsInitPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public_api_rate_limits (
          rate_key TEXT PRIMARY KEY,
          route TEXT NOT NULL,
          client_id TEXT NOT NULL,
          window_started_at TIMESTAMPTZ NOT NULL,
          request_count INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_public_api_rate_limits_expires_at
        ON public_api_rate_limits (expires_at)
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public_api_idempotency (
          idempotency_key TEXT PRIMARY KEY,
          route TEXT NOT NULL,
          client_id TEXT NOT NULL,
          request_hash TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'in_progress',
          http_status INTEGER,
          response_body JSONB,
          error_message TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_public_api_idempotency_expires_at
        ON public_api_idempotency (expires_at)
      `);
    })();
  }

  await guardsInitPromise;
}

async function maybeCleanupGuardRows(): Promise<void> {
  cleanupCounter += 1;
  if (cleanupCounter % 50 !== 0) return;

  await prisma.$transaction([
    prisma.$executeRaw`
      DELETE FROM public_api_rate_limits
      WHERE expires_at < NOW()
    `,
    prisma.$executeRaw`
      DELETE FROM public_api_idempotency
      WHERE expires_at < NOW()
    `,
  ]);
}

export async function checkRateLimit({
  request,
  route,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
  count: number;
}> {
  await ensureGuardTables();
  await maybeCleanupGuardRows();

  const clientId = getClientIdentity(request);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const windowEndMs = windowStartMs + windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - now) / 1000));
  const expiresAt = new Date(windowEndMs + windowMs);
  const rateKey = `${route}:${clientId}:${windowStartMs}`;

  type RateRow = { request_count: number };
  const rows = await prisma.$queryRaw<RateRow[]>(Prisma.sql`
    INSERT INTO public_api_rate_limits (
      rate_key,
      route,
      client_id,
      window_started_at,
      request_count,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      ${rateKey},
      ${route},
      ${clientId},
      ${windowStart},
      1,
      ${expiresAt},
      NOW(),
      NOW()
    )
    ON CONFLICT (rate_key)
    DO UPDATE SET
      request_count = public_api_rate_limits.request_count + 1,
      updated_at = NOW()
    RETURNING request_count
  `);

  const count = Number(rows[0]?.request_count ?? 1);
  const allowed = count <= limit;
  if (!allowed) {
    const context = getRequestContext(request);
    await logActivitySafe({
      category: "security",
      action: "rate_limit_exceeded",
      status: "blocked",
      subjectType: "PublicApiRoute",
      subjectLabel: route,
      message: "Request blocked by public API rate limiter",
      ...context,
      meta: {
        route,
        requestCount: count,
        limit,
        windowSeconds,
      },
    });
  }
  return {
    allowed,
    retryAfterSeconds,
    count,
  };
}

export async function beginIdempotency({
  request,
  route,
  requestHash,
  idempotencyKey,
  ttlSeconds = DEFAULT_IDEMPOTENCY_TTL_SECONDS,
  inProgressTimeoutSeconds = DEFAULT_IN_PROGRESS_TIMEOUT_SECONDS,
}: BeginIdempotencyOptions): Promise<BeginIdempotencyResult> {
  await ensureGuardTables();
  await maybeCleanupGuardRows();

  const clientId = getClientIdentity(request);
  const rawKey = idempotencyKey?.trim();
  const key = rawKey?.length
    ? `${route}:manual:${rawKey}`
    : `${route}:auto:${clientId}:${requestHash}`;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  type InsertRow = { idempotency_key: string };
  const inserted = await prisma.$queryRaw<InsertRow[]>(Prisma.sql`
    INSERT INTO public_api_idempotency (
      idempotency_key,
      route,
      client_id,
      request_hash,
      status,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      ${key},
      ${route},
      ${clientId},
      ${requestHash},
      'in_progress',
      ${expiresAt},
      NOW(),
      NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING idempotency_key
  `);

  if (inserted.length > 0) {
    return { kind: "proceed", key };
  }

  type ExistingRow = {
    idempotency_key: string;
    route: string;
    client_id: string;
    request_hash: string;
    status: string;
    http_status: number | null;
    response_body: unknown | null;
    updated_at: Date;
  };

  const existingRows = await prisma.$queryRaw<ExistingRow[]>(Prisma.sql`
    SELECT
      idempotency_key,
      route,
      client_id,
      request_hash,
      status,
      http_status,
      response_body,
      updated_at
    FROM public_api_idempotency
    WHERE idempotency_key = ${key}
    LIMIT 1
  `);
  const existing = existingRows[0];

  if (!existing) {
    return { kind: "proceed", key };
  }

  if (existing.route !== route || existing.client_id !== clientId) {
    const context = getRequestContext(request);
    await logActivitySafe({
      category: "security",
      action: "idempotency_conflict",
      status: "blocked",
      subjectType: "PublicApiRoute",
      subjectLabel: route,
      message: "Idempotency key reused across different client or route",
      ...context,
      meta: {
        route,
        key,
      },
    });
    return {
      kind: "conflict",
      key,
      message: "Idempotency key already used by another request",
    };
  }

  if (existing.request_hash !== requestHash) {
    const context = getRequestContext(request);
    await logActivitySafe({
      category: "security",
      action: "idempotency_payload_mismatch",
      status: "blocked",
      subjectType: "PublicApiRoute",
      subjectLabel: route,
      message: "Idempotency key reused with a different payload hash",
      ...context,
      meta: {
        route,
        key,
      },
    });
    return {
      kind: "conflict",
      key,
      message: "Idempotency key reused with a different payload",
    };
  }

  if (
    existing.status === "succeeded" &&
    existing.http_status !== null &&
    existing.response_body !== null
  ) {
    const context = getRequestContext(request);
    await logActivitySafe({
      category: "idempotency",
      action: "idempotency_replay_served",
      status: "success",
      subjectType: "PublicApiRoute",
      subjectLabel: route,
      message: "Served cached response for duplicate idempotent request",
      ...context,
      meta: {
        route,
        key,
        httpStatus: existing.http_status,
      },
    });
    return {
      kind: "replay",
      key,
      httpStatus: existing.http_status,
      responseBody: existing.response_body,
    };
  }

  if (existing.status === "in_progress") {
    const ageMs = Date.now() - new Date(existing.updated_at).getTime();
    if (ageMs < inProgressTimeoutSeconds * 1000) {
      const context = getRequestContext(request);
      await logActivitySafe({
        category: "idempotency",
        action: "idempotency_in_progress",
        status: "blocked",
        subjectType: "PublicApiRoute",
        subjectLabel: route,
        message: "Duplicate idempotent request is still in progress",
        ...context,
        meta: {
          route,
          key,
          ageMs,
          timeoutMs: inProgressTimeoutSeconds * 1000,
        },
      });
      return {
        kind: "in_progress",
        key,
        message: "Duplicate request is currently being processed",
      };
    }
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE public_api_idempotency
    SET
      status = 'in_progress',
      updated_at = NOW(),
      expires_at = ${expiresAt}
    WHERE idempotency_key = ${key}
  `);

  return { kind: "proceed", key };
}

export async function finalizeIdempotencySuccess(params: {
  key: string;
  httpStatus: number;
  responseBody: unknown;
  ttlSeconds?: number;
}): Promise<void> {
  await ensureGuardTables();

  const ttlSeconds = params.ttlSeconds ?? DEFAULT_IDEMPOTENCY_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const responseBodyJson = JSON.stringify(params.responseBody ?? {});

  await prisma.$executeRaw(Prisma.sql`
    UPDATE public_api_idempotency
    SET
      status = 'succeeded',
      http_status = ${params.httpStatus},
      response_body = ${responseBodyJson}::jsonb,
      error_message = NULL,
      updated_at = NOW(),
      expires_at = ${expiresAt}
    WHERE idempotency_key = ${params.key}
  `);
}

export async function finalizeIdempotencyFailure(params: {
  key: string;
  httpStatus: number;
  errorMessage: string;
  ttlSeconds?: number;
}): Promise<void> {
  await ensureGuardTables();

  const ttlSeconds = params.ttlSeconds ?? 10 * 60;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE public_api_idempotency
    SET
      status = 'failed',
      http_status = ${params.httpStatus},
      error_message = ${params.errorMessage},
      updated_at = NOW(),
      expires_at = ${expiresAt}
    WHERE idempotency_key = ${params.key}
  `);
}
