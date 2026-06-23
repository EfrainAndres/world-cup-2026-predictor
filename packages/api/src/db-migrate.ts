import postgres from "postgres";
import { runMigrations } from "./migration-runner.js";


async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl === undefined || databaseUrl === "") {
    console.error("DATABASE_URL is required to run API migrations.");
    process.exitCode = 1;
    return;
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  try {
    await runMigrations(sql);
    console.log("API migrations completed successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown migration error.";
    console.error(`API migrations failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

await main();
