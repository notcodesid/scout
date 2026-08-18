import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // The DB is remote (Supabase) and already fronted by a transaction pooler, so
  // each instance only needs a small local pool. Timeouts are explicit because a
  // hung connection over the network would otherwise stall a server action.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
    max: 5,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
