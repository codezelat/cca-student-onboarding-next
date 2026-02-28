import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNextPaymentNo(tx: any, registrationId: bigint) {
  const lastPayment = await tx.registrationPayment.findFirst({
    where: { ccaRegistrationId: registrationId },
    orderBy: { paymentNo: "desc" },
  });

  return (lastPayment?.paymentNo ?? 0) + 1;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncRegistrationPaidAmount(tx: any, registrationId: bigint) {
  const [activePaymentsTotal, deductionPaymentsTotal] = await Promise.all([
    tx.registrationPayment.aggregate({
      where: {
        ccaRegistrationId: registrationId,
        status: "active",
      },
      _sum: { amount: true },
    }),
    tx.registrationPayment.aggregate({
      where: {
        ccaRegistrationId: registrationId,
        status: "void",
        // Deduction rows are manually entered as VOID.
        // Rows voided later from an active payment have voidedAt set and should be neutral.
        voidedAt: null,
      },
      _sum: { amount: true },
    }),
  ]);

  const paidAmount =
    Number(activePaymentsTotal._sum.amount || 0) -
    Number(deductionPaymentsTotal._sum.amount || 0);

  await tx.cCARegistration.update({
    where: { id: registrationId },
    data: {
      currentPaidAmount: paidAmount,
    },
  });

  return paidAmount;
}

export async function syncRegistrationPaidAmountDirect(registrationId: bigint) {
  return prisma.$transaction(async (tx) =>
    syncRegistrationPaidAmount(tx, registrationId),
  );
}
