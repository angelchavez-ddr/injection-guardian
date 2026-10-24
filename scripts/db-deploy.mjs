import crypto from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv();
loadEnv({ path: ".env.local", override: true });

async function main() {
  const url =
    process.env.TURSO_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "file:./dev.db";
  const authToken =
    process.env.TURSO_DATABASE_KEY?.trim() ||
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    undefined;

  const resolvedUrl = resolveUrl(url);
  console.log(`Deploying migrations to: ${maskUrl(resolvedUrl)}`);

  const client = createClient({
    url: resolvedUrl,
    authToken,
  });

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    TEXT PRIMARY KEY NOT NULL,
        "checksum"              TEXT NOT NULL,
        "finished_at"           DATETIME,
        "migration_name"        TEXT NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        DATETIME,
        "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
      );
    `);

    const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
    const entries = readdirSync(migrationsDir)
      .filter((entry) => {
        const fullPath = path.join(migrationsDir, entry);
        return statSync(fullPath).isDirectory();
      })
      .sort();

    for (const migrationName of entries) {
      const existing = await client.execute({
        sql: `SELECT id FROM "_prisma_migrations" WHERE migration_name = ? AND finished_at IS NOT NULL`,
        args: [migrationName],
      });

      if (existing.rows.length > 0) {
        console.log(`✓ Migration already applied: ${migrationName}`);
        continue;
      }

      const sqlPath = path.join(migrationsDir, migrationName, "migration.sql");
      const sql = readFileSync(sqlPath, "utf8");

      console.log(`→ Applying migration: ${migrationName}...`);
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await client.execute(statement);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (/already exists/i.test(message) || /duplicate column name/i.test(message)) {
            console.log(`  (already present, continuing)`);
          } else {
            throw err;
          }
        }
      }

      await client.execute({
        sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, CURRENT_TIMESTAMP, ?, 1)`,
        args: [crypto.randomUUID(), "libsql-deploy", migrationName],
      });

      console.log(`✓ Applied migration: ${migrationName}`);
    }

    console.log("All migrations deployed successfully.");
  } finally {
    client.close();
  }
}

function resolveUrl(url) {
  if (!url.startsWith("file:")) {
    return url;
  }
  const raw = url.slice("file:".length).replace(/^\/\//, "");
  if (raw.startsWith("/")) {
    return `file:${raw}`;
  }
  return `file:${path.resolve(process.cwd(), raw)}`;
}

function maskUrl(url) {
  if (url.startsWith("file:")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

main().catch((err) => {
  console.error("Migration deployment failed:", err);
  process.exit(1);
});
