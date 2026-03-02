import "server-only";

import { headers } from "next/headers";

export type AdminRequestIdentity = {
  userId: string;
  role: "admin";
  email?: string;
  name?: string;
};

export class AdminAuthorizationError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AdminAuthorizationError";
    this.status = status;
  }
}

function decodeHeaderValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeHeader(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  return decodeHeaderValue(trimmed);
}

export function getAdminIdentityFromHeaders(
  headersLike: Headers,
): AdminRequestIdentity | null {
  const userId = normalizeHeader(headersLike.get("x-admin-user-id"));
  if (!userId) return null;

  const role = normalizeHeader(headersLike.get("x-admin-user-role"))?.toLowerCase();
  if (role !== "admin") return null;

  return {
    userId,
    role: "admin",
    email: normalizeHeader(headersLike.get("x-admin-user-email")) || undefined,
    name: normalizeHeader(headersLike.get("x-admin-user-name")) || undefined,
  };
}

export function getAdminIdentityStatus(headersLike: Headers): {
  authorized: boolean;
  status: 401 | 403;
  message: string;
  identity: AdminRequestIdentity | null;
} {
  const userId = normalizeHeader(headersLike.get("x-admin-user-id"));
  if (!userId) {
    return {
      authorized: false,
      status: 401,
      message: "Authentication required.",
      identity: null,
    };
  }

  const role = normalizeHeader(headersLike.get("x-admin-user-role"))?.toLowerCase();
  if (role !== "admin") {
    return {
      authorized: false,
      status: 403,
      message: "Admin access required.",
      identity: null,
    };
  }

  return {
    authorized: true,
    status: 403,
    message: "",
    identity: {
      userId,
      role: "admin",
      email: normalizeHeader(headersLike.get("x-admin-user-email")) || undefined,
      name: normalizeHeader(headersLike.get("x-admin-user-name")) || undefined,
    },
  };
}

export async function assertAdminFromServerHeaders(): Promise<AdminRequestIdentity> {
  const headerStore = await headers();
  const status = getAdminIdentityStatus(headerStore);

  if (!status.authorized || !status.identity) {
    throw new AdminAuthorizationError(status.status, status.message);
  }

  return status.identity;
}
