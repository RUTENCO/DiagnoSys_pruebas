// lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const directDatabaseUrl = process.env.DATABASE_URL_DIRECT;
const accelerateDatabaseUrl = process.env.DATABASE_URL;

if (!directDatabaseUrl && !accelerateDatabaseUrl) {
    throw new Error("DATABASE_URL_DIRECT or DATABASE_URL must be defined");
}

const prismaClient = (() => {
    if (globalForPrisma.prisma) {
        return globalForPrisma.prisma;
    }

    if (directDatabaseUrl) {
        return new PrismaClient({
            adapter: new PrismaPg(directDatabaseUrl),
        });
    }

    return new PrismaClient({
        accelerateUrl: accelerateDatabaseUrl!,
    });
})();

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;