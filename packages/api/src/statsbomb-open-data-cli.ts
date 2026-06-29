import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createStatsBombOpenDataProvider } from "./providers/statsbomb/statsbomb-open-data-provider.js";
import { isValidIsoTimestamp, normalizeToIsoTimestamp } from "./statsbomb-cli-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, "../../..");

const dataDir =
  process.env["STATSBOMB_OPEN_DATA_DIR"] ??
  join(MONOREPO_ROOT, ".local-data", "statsbomb-open-data");

function resolveCutoff(): string {
  const argIdx = process.argv.indexOf("--cutoff-at");
  if (argIdx !== -1) {
    const val = process.argv[argIdx + 1] ?? "";
    if (!isValidIsoTimestamp(val)) {
      console.error(`ERROR: --cutoff-at value '${val}' is not a valid ISO timestamp.`);
      console.error("Expected: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ  (e.g. 2026-06-01T00:00:00.000Z)");
      process.exit(1);
    }
    return normalizeToIsoTimestamp(val);
  }
  const envVal = process.env["STATSBOMB_PROFILE_CUTOFF_AT"];
  if (envVal !== undefined) {
    if (!isValidIsoTimestamp(envVal)) {
      console.error(`ERROR: STATSBOMB_PROFILE_CUTOFF_AT='${envVal}' is not a valid ISO timestamp.`);
      process.exit(1);
    }
    return normalizeToIsoTimestamp(envVal);
  }
  return new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

const cutoffAt = resolveCutoff();

const outputPath =
  process.env["STATSBOMB_PROFILE_OUTPUT_PATH"] ??
  join(MONOREPO_ROOT, "docs", "model-results", "artifacts", "statsbomb-team-performance-profiles.json");

async function run(): Promise<void> {
  if (!existsSync(dataDir)) {
    console.error(`ERROR: StatsBomb data directory not found: ${dataDir}`);
    console.error("Run: pnpm --filter @world-cup-2026-predictor/api statsbomb:download");
    process.exit(1);
  }

  console.log(`StatsBomb Open Data Profile Builder`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Cutoff: ${cutoffAt}`);
  console.log(`Output: ${outputPath}`);
  console.log();

  const provider = createStatsBombOpenDataProvider(dataDir);
  const results = await provider.listTeamPerformanceProfiles(cutoffAt);

  const coverageCounts: Record<string, number> = {
    full: 0,
    partial: 0,
    sparse: 0,
    fallback: 0,
  };

  let totalMatchCount = 0;
  let teamsWithWarnings = 0;
  let teamsWithIssues = 0;

  for (const result of results) {
    const cov = result.profile.coverage;
    if (cov in coverageCounts) {
      coverageCounts[cov] = (coverageCounts[cov] ?? 0) + 1;
    }
    totalMatchCount += result.profile.matchCount;
    if (result.profile.warnings.length > 0) teamsWithWarnings++;
    if (result.issues.length > 0) teamsWithIssues++;
  }

  console.log(`Teams processed: ${results.length}`);
  console.log(`  Full coverage: ${coverageCounts["full"] ?? 0}`);
  console.log(`  Partial coverage: ${coverageCounts["partial"] ?? 0}`);
  console.log(`  Sparse coverage: ${coverageCounts["sparse"] ?? 0}`);
  console.log(`  Fallback (no data): ${coverageCounts["fallback"] ?? 0}`);
  console.log(`Total match contributions: ${totalMatchCount}`);
  if (teamsWithWarnings > 0) console.log(`Teams with warnings: ${teamsWithWarnings}`);
  if (teamsWithIssues > 0) console.log(`Teams with issues: ${teamsWithIssues}`);

  const artifact = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    cutoffAt,
    source: "statsbomb_open_data",
    teamCount: results.length,
    coverageSummary: {
      full: coverageCounts["full"] ?? 0,
      partial: coverageCounts["partial"] ?? 0,
      sparse: coverageCounts["sparse"] ?? 0,
      fallback: coverageCounts["fallback"] ?? 0,
    },
    profiles: results.map((r) => r.profile),
  };

  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(artifact, null, 2), "utf-8");
  console.log(`\nArtifact written: ${outputPath}`);
}

run().catch((e: unknown) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
