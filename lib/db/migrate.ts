import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

async function ensureSchemaMigrationsTable(client: import("pg").PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function listAppliedMigrations(
  client: import("pg").PoolClient,
): Promise<Set<string>> {
  const { rows } = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename ASC",
  );
  return new Set(rows.map((r) => r.filename as string));
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureSchemaMigrationsTable(client);
    const applied = await listAppliedMigrations(client);
    const files = await listMigrationFiles();

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      await client.query("ROLLBACK");
      console.log(" No pending migrations. Already up to date.");
      return;
    }

    for (const filename of pending) {
      const filepath = join(MIGRATIONS_DIR, filename);
      const sql = await readFile(filepath, "utf8");
      console.log(` Applying ${filename}...`);

      // Each migration file is run as a single batch inside the outer transaction.
      // A failure anywhere in the file aborts the whole migration run.
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [filename],
      );

      console.log(` ✓ Applied ${filename}`);
    }

    await client.query("COMMIT");
    console.log(` Migrations complete. ${pending.length} file(s) applied.`);
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // connection may already be dead; nothing to roll back
      }
    }
    console.error(" Migration failed and rolled back:");
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    client?.release();
  }
}

runMigrations()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
