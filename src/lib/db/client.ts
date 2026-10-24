import "server-only";
import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";

const globalForPrisma = globalThis as unknown as {
  injectionGuardianPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.injectionGuardianPrisma) {
    return globalForPrisma.injectionGuardianPrisma;
  }

  const env = getServerEnv();
  const adapter = new PrismaLibSql({
    url: resolveDatabaseUrl(env.DATABASE_URL),
    authToken: env.TURSO_AUTH_TOKEN,
  });
  const prisma = new PrismaClient({ adapter });
  globalForPrisma.injectionGuardianPrisma = prisma;
  return prisma;
}

export function resolveDatabaseUrl(url: string): string {
  if (!url.startsWith("file:")) {
    return url;
  }
  const raw = url.slice("file:".length).replace(/^\/\//, "");
  if (raw.startsWith("/")) {
    return `file:${raw}`;
  }
  return `file:${path.resolve(process.cwd(), raw)}`;
}
