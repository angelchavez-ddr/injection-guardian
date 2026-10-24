import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv();
loadEnv({ path: ".env.local", override: true });

/**
 * Prisma ORM 7 reads the datasource URL here for CLI commands (`prisma generate`, `prisma migrate`).
 * Prisma's native SQLite migration engine only accepts `file:` URLs and cannot connect directly to
 * `libsql://` (Turso). At runtime, the Next.js app connects to Turso via `@prisma/adapter-libsql`
 * using `getServerEnv()`. For remote Turso migrations, `npm run db:deploy` applies the SQL migrations
 * via `@libsql/client`.
 */
function datasourceUrl(): string {
  const configured = process.env.DATABASE_URL?.trim();
  const url =
    configured && configured.startsWith("file:") ? configured : "file:./dev.db";

  const raw = url.slice("file:".length).replace(/^\/\//, "");
  if (raw.startsWith("/")) {
    return `file:${raw}`;
  }

  return `file:${path.resolve(process.cwd(), raw)}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
