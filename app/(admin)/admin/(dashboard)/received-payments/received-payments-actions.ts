"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  getAdminActorFromRequestHeaders,
  logActivitySafe,
} from "@/lib/server/activity-log";
import {
  getNextPaymentNo,
  syncRegistrationPaidAmount,
} from "@/lib/server/payment-ledger";

/**
 * Payment slip structure
 */
interface PaymentSlip {
  id?: string;
  url: string;
  status?: "pending" | "approved" | "declined";
  uploadedAt?: string;
  approvedAt?: string;
  declinedAt?: string;
}

interface PendingPaymentExtract {
  registrationId: string;
  registerId: string;
  fullName: string;
  identifier: string;
  emailAddress: string;
  whatsappNumber: string;
  slipId: string;
  slipIndex: number;
  slipUrl: string;
  status: string;
  uploadedAt: string;
}

interface PendingPaymentsResult {
  data: PendingPaymentExtract[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * BigInt to JSON helper
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
}

export async function getPendingPayments({
  search = "",
  status = "all",
  page = 1,
  pageSize = 20,
}: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PendingPaymentsResult> {
  const requestedPage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 100);

  const normalizedStatus =
    status === "pending" || status === "approved" || status === "declined"
      ? status
      : "all";
  const searchTerm = search.trim();
  const likeSearch = `%${searchTerm}%`;

  const statusFilterSql =
    normalizedStatus === "all"
      ? Prisma.empty
      : Prisma.sql`AND COALESCE(slip->>'status', 'pending') = ${normalizedStatus}`;

  const searchFilterSql = searchTerm
    ? Prisma.sql`
      AND (
        r.full_name ILIKE ${likeSearch}
        OR COALESCE(r.nic_number, '') ILIKE ${likeSearch}
        OR r.email_address ILIKE ${likeSearch}
        OR r.whatsapp_number ILIKE ${likeSearch}
      )
    `
    : Prisma.empty;

  type CountRow = { total: bigint };
  type PaymentRow = {
    registration_id: string;
    register_id: string;
    full_name: string;
    identifier: string;
    email_address: string;
    whatsapp_number: string;
    slip_id: string;
    slip_index: number;
    slip_url: string;
    status: string;
    uploaded_at: string;
  };

  const countRows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*) AS total
    FROM cca_registrations r
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(r.payment_slip) = 'array' THEN r.payment_slip
        WHEN jsonb_typeof(r.payment_slip) = 'object' THEN jsonb_build_array(r.payment_slip)
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS slips(slip, idx)
    WHERE r.deleted_at IS NULL
      AND slip ? 'id'
      AND slip->>'id' LIKE 'slip_%'
      ${statusFilterSql}
      ${searchFilterSql}
  `;

  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const offset = (safePage - 1) * safePageSize;

  const paymentRows = await prisma.$queryRaw<PaymentRow[]>`
    SELECT
      r.id::text AS registration_id,
      r.register_id,
      r.full_name,
      COALESCE(NULLIF(r.nic_number, ''), NULLIF(r.passport_number, ''), 'N/A') AS identifier,
      r.email_address,
      r.whatsapp_number,
      slip->>'id' AS slip_id,
      (idx - 1)::int AS slip_index,
      COALESCE(slip->>'url', '') AS slip_url,
      COALESCE(slip->>'status', 'pending') AS status,
      COALESCE(
        NULLIF(slip->>'uploadedAt', ''),
        to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) AS uploaded_at
    FROM cca_registrations r
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(r.payment_slip) = 'array' THEN r.payment_slip
        WHEN jsonb_typeof(r.payment_slip) = 'object' THEN jsonb_build_array(r.payment_slip)
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS slips(slip, idx)
    WHERE r.deleted_at IS NULL
      AND slip ? 'id'
      AND slip->>'id' LIKE 'slip_%'
      ${statusFilterSql}
      ${searchFilterSql}
    ORDER BY uploaded_at ASC
    OFFSET ${offset}
    LIMIT ${safePageSize}
  `;

  const data: PendingPaymentExtract[] = paymentRows.map((row) => ({
    registrationId: row.registration_id,
    registerId: row.register_id,
    fullName: row.full_name,
    identifier: row.identifier,
    emailAddress: row.email_address,
    whatsappNumber: row.whatsapp_number,
    slipId: row.slip_id,
    slipIndex: row.slip_index,
    slipUrl: row.slip_url,
    status: row.status,
    uploadedAt: row.uploaded_at,
  }));

  return serialize({
    data,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  });
}

export async function approvePaymentSlip(
  registrationId: string,
  slipIndex: number,
  amount: number,
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const registrationBigInt = BigInt(registrationId);
  const actor = await getAdminActorFromRequestHeaders();
  const reg = await prisma.cCARegistration.findUnique({
    where: { id: registrationBigInt },
  });

  if (!reg || !reg.paymentSlip) {
    await logActivitySafe({
      actor,
      category: "payment_slip",
      action: "payment_slip_approve_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: registrationId,
      message: "Registration or payment slip not found",
      routeName: "/admin/received-payments",
      meta: { slipIndex },
    });
    throw new Error("Registration or slip not found");
  }

  let slips: PaymentSlip[] = [];
  try {
    slips = JSON.parse(JSON.stringify(reg.paymentSlip || []));
  } catch {
    slips = [];
  }

  if (!Array.isArray(slips)) {
    slips = [slips];
  }

  if (!slips[slipIndex]) {
    await logActivitySafe({
      actor,
      category: "payment_slip",
      action: "payment_slip_approve_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: reg.registerId,
      message: "Slip index out of bounds",
      routeName: "/admin/received-payments",
      meta: { slipIndex },
    });
    throw new Error("Slip index out of bounds");
  }
  if (
    slips[slipIndex].status === "approved" ||
    slips[slipIndex].status === "declined"
  ) {
    await logActivitySafe({
      actor,
      category: "payment_slip",
      action: "payment_slip_approve_blocked",
      status: "blocked",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: reg.registerId,
      message: `Slip is already ${slips[slipIndex].status}`,
      routeName: "/admin/received-payments",
      meta: {
        slipIndex,
        slipStatus: slips[slipIndex].status,
      },
    });
    throw new Error(
      `This payment slip has already been ${slips[slipIndex].status}.`,
    );
  }

  if (slips[slipIndex].id) {
    const existingPayment = await prisma.registrationPayment.findFirst({
      where: {
        ccaRegistrationId: registrationBigInt,
        receiptReference: slips[slipIndex].id,
      },
      select: { id: true },
    });

    if (existingPayment) {
      await logActivitySafe({
        actor,
        category: "payment_slip",
        action: "payment_slip_approve_blocked",
        status: "blocked",
        subjectType: "CCARegistration",
        subjectId: registrationId,
        subjectLabel: reg.registerId,
        message: "Slip already logged as a payment record",
        routeName: "/admin/received-payments",
        meta: {
          slipIndex,
          slipId: slips[slipIndex].id,
        },
      });
      throw new Error("This payment slip is already recorded in finance.");
    }
  }

  const beforeSnapshot = {
    registration: {
      id: reg.id,
      registerId: reg.registerId,
      fullName: reg.fullName,
      currentPaidAmount: reg.currentPaidAmount,
    },
    slip: slips[slipIndex],
  };

  // 1. Update Slip Status
  slips[slipIndex].status = "approved";
  slips[slipIndex].approvedAt = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createdPayment: any = null;
  let syncedPaidAmount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.cCARegistration.update({
      where: { id: registrationBigInt },
      data: {
        paymentSlip: JSON.parse(JSON.stringify(slips)),
      },
    });

    const nextPaymentNo = await getNextPaymentNo(tx, registrationBigInt);
    createdPayment = await tx.registrationPayment.create({
      data: {
        ccaRegistrationId: registrationBigInt,
        paymentNo: nextPaymentNo,
        amount,
        paymentMethod: "Bank Transfer",
        paymentDate: new Date(),
        receiptReference: slips[slipIndex].id || `Slip Approved`,
        note: "Approved from student portal slip upload",
        status: "active",
      },
    });

    syncedPaidAmount = await syncRegistrationPaidAmount(tx, registrationBigInt);
  });

  if (!createdPayment) {
    throw new Error("Failed to create payment record");
  }

  await logActivitySafe({
    actor,
    category: "payment_slip",
    action: "payment_slip_approved",
    status: "success",
    subjectType: "CCARegistration",
    subjectId: registrationId,
    subjectLabel: reg.registerId,
    message: "Payment slip approved and ledger entry created",
    routeName: "/admin/received-payments",
    beforeData: beforeSnapshot,
    afterData: {
      paymentNo: createdPayment.paymentNo,
      amount: createdPayment.amount,
      slip: slips[slipIndex],
      newPaidAmount: syncedPaidAmount,
    },
    meta: {
      slipIndex,
      amount,
    },
  });

  revalidatePath("/admin/received-payments");
  revalidatePath(`/admin/registrations/${registrationId}`);
  return { success: true };
}

export async function declinePaymentSlip(
  registrationId: string,
  slipIndex: number,
) {
  const actor = await getAdminActorFromRequestHeaders();
  const reg = await prisma.cCARegistration.findUnique({
    where: { id: BigInt(registrationId) },
  });

  if (!reg || !reg.paymentSlip) {
    await logActivitySafe({
      actor,
      category: "payment_slip",
      action: "payment_slip_decline_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: registrationId,
      message: "Registration or payment slip not found",
      routeName: "/admin/received-payments",
      meta: { slipIndex },
    });
    throw new Error("Registration or slip not found");
  }

  let slips: PaymentSlip[] = [];
  try {
    slips = JSON.parse(JSON.stringify(reg.paymentSlip || []));
  } catch {
    slips = [];
  }

  if (!Array.isArray(slips)) {
    slips = [slips];
  }

  if (!slips[slipIndex]) {
    await logActivitySafe({
      actor,
      category: "payment_slip",
      action: "payment_slip_decline_failed",
      status: "failure",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: reg.registerId,
      message: "Slip index out of bounds",
      routeName: "/admin/received-payments",
      meta: { slipIndex },
    });
    throw new Error("Slip index out of bounds");
  }
  if (
    slips[slipIndex].status === "approved" ||
    slips[slipIndex].status === "declined"
  ) {
    await logActivitySafe({
      actor,
      category: "payment_slip",
      action: "payment_slip_decline_blocked",
      status: "blocked",
      subjectType: "CCARegistration",
      subjectId: registrationId,
      subjectLabel: reg.registerId,
      message: `Slip is already ${slips[slipIndex].status}`,
      routeName: "/admin/received-payments",
      meta: {
        slipIndex,
        slipStatus: slips[slipIndex].status,
      },
    });
    throw new Error(
      `This payment slip has already been ${slips[slipIndex].status}.`,
    );
  }

  const beforeSnapshot = {
    registration: {
      id: reg.id,
      registerId: reg.registerId,
      fullName: reg.fullName,
      currentPaidAmount: reg.currentPaidAmount,
    },
    slip: slips[slipIndex],
  };

  // 1. Update Slip Status
  slips[slipIndex].status = "declined";
  slips[slipIndex].declinedAt = new Date().toISOString();

  await prisma.cCARegistration.update({
    where: { id: BigInt(registrationId) },
    data: {
      paymentSlip: JSON.parse(JSON.stringify(slips)),
    },
  });

  await logActivitySafe({
    actor,
    category: "payment_slip",
    action: "payment_slip_declined",
    status: "success",
    subjectType: "CCARegistration",
    subjectId: registrationId,
    subjectLabel: reg.registerId,
    message: "Payment slip declined",
    routeName: "/admin/received-payments",
    beforeData: beforeSnapshot,
    afterData: {
      slip: slips[slipIndex],
    },
    meta: {
      slipIndex,
    },
  });

  revalidatePath("/admin/received-payments");
  return { success: true };
}
