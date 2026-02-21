import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function generateRegisterId(): Promise<string> {
    const latestRegistration = await prisma.cCARegistration.findFirst({
        orderBy: {
            id: "desc",
        },
    });

    if (!latestRegistration) {
        return "cca-A00001";
    }

    const currentId = latestRegistration.registerId;
    const currentNumber = parseInt(currentId.split("-A")[1] || "0", 10);
    const nextNumber = currentNumber + 1;

    // Pad with zeros to 5 digits
    const paddedNumber = nextNumber.toString().padStart(5, "0");
    return `cca-A${paddedNumber}`;
}

export async function createRegistration(
    data: Omit<Prisma.CCARegistrationUncheckedCreateInput, "registerId">,
) {
    const registerId = await generateRegisterId();

    return await prisma.cCARegistration.create({
        data: {
            ...data,
            registerId,
        },
    });
}
