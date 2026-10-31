import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/server/public-api-guard";
import { getRequestContext, logActivitySafe } from "@/lib/server/activity-log";
import { formatStudentId } from "@/lib/student-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const inputSchema = z.object({ studentId: z.string().trim().toUpperCase().regex(/^CCA-A\d{5,}-\d{2}$/).max(64) }).strict();

function json(body: object, status: number, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(request: Request) {
  const secret = process.env.STUDENT_LOOKUP_API_KEY;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) return json({ error: "Service unavailable" }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(supplied), hash(secret))) return json({ error: "Unauthorized" }, 401);

  try {
    const limit = await checkRateLimit({ request, route: "integration:student-lookup", limit: 60, windowSeconds: 60 });
    if (!limit.allowed) return json({ error: "Too many requests" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Invalid request" }, 400);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Invalid request" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return json({ error: "Invalid request" }, 400);
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid request" }, 400); }
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Invalid student ID" }, 400);

    const registerId = parsed.data.studentId.slice(0, -3);
    const registration = await prisma.cCARegistration.findFirst({
      where: { registerId: { equals: registerId, mode: "insensitive" }, deletedAt: null },
      select: { id: true, registerId: true, createdAt: true, fullName: true, emailAddress: true, programId: true, programName: true, programYear: true },
    });
    const matched = registration && formatStudentId(registration.registerId, registration.createdAt) === parsed.data.studentId;
    await logActivitySafe({
      category: "integration", action: "student_lookup", status: "success",
      subjectType: "StudentLookup", message: matched ? "Student lookup matched" : "Student lookup had no match",
      ...getRequestContext(request),
    });
    if (!matched) return json({ error: "Student not found" }, 404);
    return json({ studentId: parsed.data.studentId, registrationId: registration.id.toString(), name: registration.fullName, email: registration.emailAddress, program: { code: registration.programId, name: registration.programName, year: registration.programYear } }, 200);
  } catch (error) {
    console.error("Student integration lookup failed", error instanceof Error ? error.name : "Unknown error");
    return json({ error: "Service unavailable" }, 503);
  }
}
