import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const adapter = new PrismaPg(pool, {
    onConnectionError: (err) => {
      console.error("[Prisma] pg connection error:", err);
    },
  });

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
    const client = globalForPrisma.prisma as PrismaClientSingleton;
    const value = client[prop as keyof PrismaClientSingleton];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

if (process.env.NODE_ENV !== "production") {
  // Only assign it globally once it's been initialized
  // globalForPrisma.prisma = prisma; // Handled by proxy
}
