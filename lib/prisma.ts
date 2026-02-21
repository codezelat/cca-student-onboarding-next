import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const prismaClientSingleton = () => {
    const connectionString = `${process.env.DIRECT_URL || process.env.DATABASE_URL}`;

    // For local development or non-pooled environments, pg.Pool is standard
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

// Lazy initialization using a Proxy to prevent evaluation during Next.js build time
export const prisma = new Proxy({} as PrismaClientSingleton, {
    get(target, prop) {
        if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = prismaClientSingleton();
        }
        const client = globalForPrisma.prisma as any;
        const value = client[prop];
        return typeof value === "function" ? value.bind(client) : value;
    },
});

if (process.env.NODE_ENV !== "production") {
    // Only assign it globally once it's been initialized
    // globalForPrisma.prisma = prisma; // Handled by proxy
}
