import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { sql } from "drizzle-orm";

import { db, pool } from "@/db/client";

async function getCurrentMigrationHash() {
  const migrationPath = path.join(process.cwd(), "drizzle", "0000_init.sql");
  const migrationSql = await readFile(migrationPath, "utf8");

  return createHash("sha256").update(migrationSql).digest("hex");
}

async function baselineSquashedMigration() {
  const currentHash = await getCurrentMigrationHash();

  const migrationRows = await db.execute<{ id: number; hash: string }>(
    sql`select id, hash from drizzle.__drizzle_migrations order by created_at`,
  );

  const hasCurrentHash = migrationRows.rows.some((row: { hash: string }) => row.hash === currentHash);
  if (hasCurrentHash) return;

  const tableRows = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('zones', 'tables', 'bookings', 'services')
  `);

  const hasExistingSchema = tableRows.rows.length > 0;
  const hasPriorMigrationHistory = migrationRows.rows.length > 0;

  if (!hasExistingSchema || !hasPriorMigrationHistory) return;

  await db.execute(
    sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${currentHash}, ${Date.now()})`,
  );
}

const execAsync = promisify(exec);

async function main() {
  await baselineSquashedMigration();

  const { stdout, stderr } = await execAsync("npm exec -- drizzle-kit migrate", {
    cwd: process.cwd(),
    env: process.env,
  });

  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
