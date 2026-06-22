import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Sql } from "postgres";

// --------------------------------------------------------------------------
// Migration runner — minimal SQL-file execution boundary for testing.
//
// This runner reads versioned *.sql files from a migrations directory and
// executes them in lexicographic order. It is intentionally minimal and is
// not a full production migration CLI.
//
// Production usage:
//   Run `node -e "import('./src/migration-runner.js').then(m => m.runMigrations(sql))"` or
//   integrate into a future dedicated migration script. Never auto-run during
//   application requests.
//
// Test usage:
//   Call runMigrations(sql, migrationsDir) before PostgreSQL adapter contract tests.
// --------------------------------------------------------------------------

export async function runMigrations(sql: Sql, migrationsDir?: string): Promise<void> {
  const dir = migrationsDir ?? fileURLToPath(new URL("../migrations", import.meta.url));

  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (err) {
    throw new Error(`Migration directory not found: ${dir}`, { cause: err });
  }

  for (const file of files) {
    const sqlText = readFileSync(join(dir, file), "utf-8");
    await sql.unsafe(sqlText);
  }
}
