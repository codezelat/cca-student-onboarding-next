"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
}: {
  search?: string;
  status?: string;
}) {
  // 1. Fetch registrations that have basic text matching the search query (if provided)
  const registrations = await prisma.cCARegistration.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { nicNumber: { contains: search, mode: "insensitive" } },
              { emailAddress: { contains: search, mode: "insensitive" } },
              { whatsappNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      registerId: true,
      fullName: true,
      nicNumber: true,
      passportNumber: true,
      emailAddress: true,
      whatsappNumber: true,
      paymentSlip: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 2. Filter down to only those registrations whose paymentSlip array contains at least one "pending" slip
  const pendingExtracts: PendingPaymentExtract[] = [];

  for (const reg of registrations) {
    if (!reg.paymentSlip) continue;

    let slips: PaymentSlip[] = [];
    if (Array.isArray(reg.paymentSlip)) {
      slips = reg.paymentSlip as unknown as PaymentSlip[];
    } else if (
      typeof reg.paymentSlip === "object" &&
      reg.paymentSlip !== null
    ) {
      // Edge case where it's a single object
      slips = [reg.paymentSlip as unknown as PaymentSlip];
    }

    slips.forEach((slip, index) => {
      // FILTER: Only show slips submitted via /cca/payment portal (not initial registration slips)
      // Payment update slips have an 'id' field starting with 'slip_'
      // Initial registration slips only have 'url' field
      if (!slip.id || !slip.id.startsWith("slip_")) {
        return; // Skip initial registration payment slips
      }

      const currentSlipStatus = slip.status || "pending";
      if (status === "all" || currentSlipStatus === status) {
        pendingExtracts.push({
          registrationId: reg.id.toString(),
          registerId: reg.registerId,
          fullName: reg.fullName,
          identifier: reg.nicNumber || reg.passportNumber || "N/A",
          emailAddress: reg.emailAddress,
          whatsappNumber: reg.whatsappNumber,
          slipId: slip.id,
          slipIndex: index,
          slipUrl: slip.url,
          status: currentSlipStatus,
          uploadedAt: slip.uploadedAt || new Date().toISOString(),
        });
      }
    });
  }

  // Sort by upload date (oldest first, to process queue fairly)
  pendingExtracts.sort(
    (a, b) =>
      new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  );

  return serialize(pendingExtracts);
}

export async function approvePaymentSlip(
  registrationId: string,
  slipIndex: number,
  amount: number,
) {
  const reg = await prisma.cCARegistration.findUnique({
    where: { id: BigInt(registrationId) },
  });

  if (!reg || !reg.paymentSlip)
    throw new Error("Registration or slip not found");

  let slips: PaymentSlip[] = [];
  try {
    slips = JSON.parse(JSON.stringify(reg.paymentSlip || []));
  } catch {
    slips = [];
  }

  if (!Array.isArray(slips)) {
    slips = [slips];
  }

  if (!slips[slipIndex]) throw new Error("Slip index out of bounds");
  if (
    slips[slipIndex].status === "approved" ||
    slips[slipIndex].status === "declined"
  ) {
    throw new Error(
      `This payment slip has already been ${slips[slipIndex].status}.`,
    );
  }

  // 1. Update Slip Status
  slips[slipIndex].status = "approved";
  slips[slipIndex].approvedAt = new Date().toISOString();

  const currentPaidAmount = reg.currentPaidAmount
    ? Number(reg.currentPaidAmount)
    : 0;
  const newPaidAmount = currentPaidAmount + amount;

  // 2. Update Registration
  await prisma.cCARegistration.update({
    where: { id: BigInt(registrationId) },
    data: {
      paymentSlip: JSON.parse(JSON.stringify(slips)),
      currentPaidAmount: newPaidAmount,
    },
  });

  // 3. Determine Payment Number (max + 1)
  const lastPayment = await prisma.registrationPayment.findFirst({
    where: { ccaRegistrationId: BigInt(registrationId) },
    orderBy: { paymentNo: "desc" },
  });
  const nextPaymentNo = (lastPayment?.paymentNo ?? 0) + 1;

  // 4. Create Formal Payment Record
  await prisma.registrationPayment.create({
    data: {
      ccaRegistrationId: BigInt(registrationId),
      paymentNo: nextPaymentNo,
      amount,
      paymentMethod: "Bank Transfer", // Defaulting as slips usually represent transfers
      paymentDate: new Date(),
      receiptReference: slips[slipIndex].id || `Slip Approved`,
      note: "Approved from student portal slip upload",
      status: "active",
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
  const reg = await prisma.cCARegistration.findUnique({
    where: { id: BigInt(registrationId) },
  });

  if (!reg || !reg.paymentSlip)
    throw new Error("Registration or slip not found");

  let slips: PaymentSlip[] = [];
  try {
    slips = JSON.parse(JSON.stringify(reg.paymentSlip || []));
  } catch {
    slips = [];
  }

  if (!Array.isArray(slips)) {
    slips = [slips];
  }

  if (!slips[slipIndex]) throw new Error("Slip index out of bounds");
  if (
    slips[slipIndex].status === "approved" ||
    slips[slipIndex].status === "declined"
  ) {
    throw new Error(
      `This payment slip has already been ${slips[slipIndex].status}.`,
    );
  }

  // 1. Update Slip Status
  slips[slipIndex].status = "declined";
  slips[slipIndex].declinedAt = new Date().toISOString();

  await prisma.cCARegistration.update({
    where: { id: BigInt(registrationId) },
    data: {
      paymentSlip: JSON.parse(JSON.stringify(slips)),
    },
  });

  revalidatePath("/admin/received-payments");
  return { success: true };
}
