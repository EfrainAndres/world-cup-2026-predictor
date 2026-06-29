import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMatchRecords } from "./providers/statsbomb/statsbomb-normalization.js";
import { STATSBOMB_SUPPORTED_COMPETITIONS } from "./providers/statsbomb/statsbomb-team-mapping.js";

const STATSBOMB_RAW_BASE =
  "https://raw.githubusercontent.com/statsbomb/open-data/master";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, "../../..");

const dataDir =
  process.env["STATSBOMB_OPEN_DATA_DIR"] ??
  join(MONOREPO_ROOT, ".local-data", "statsbomb-open-data");

const force = process.argv.includes("--force");

async function downloadText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}`);
  }
  return response.text();
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function shouldSkip(filePath: string): boolean {
  return !force && existsSync(filePath);
}

async function run(): Promise<void> {
  let competitionsDownloaded = 0;
  let matchesDownloaded = 0;
  let eventsDownloaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const comp of STATSBOMB_SUPPORTED_COMPETITIONS) {
    const matchDir = join(dataDir, "data", "matches", String(comp.competitionId));
    const matchFilePath = join(matchDir, `${comp.seasonId}.json`);

    console.log(`\n[${comp.name}] competition_id=${comp.competitionId} season_id=${comp.seasonId}`);

    let matchContent: string;
    if (shouldSkip(matchFilePath)) {
      console.log(`  Skipping matches file (already exists): ${matchFilePath}`);
      skipped++;
      try {
        const { readFileSync } = await import("node:fs");
        matchContent = readFileSync(matchFilePath, "utf-8");
      } catch {
        console.error(`  ERROR: could not read existing matches file`);
        errors++;
        continue;
      }
    } else {
      const matchUrl = `${STATSBOMB_RAW_BASE}/data/matches/${comp.competitionId}/${comp.seasonId}.json`;
      try {
        matchContent = await downloadText(matchUrl);
        ensureDir(matchDir);
        writeFileSync(matchFilePath, matchContent, "utf-8");
        console.log(`  Downloaded matches file (${matchContent.length} bytes)`);
        competitionsDownloaded++;
      } catch (e) {
        console.error(`  ERROR downloading matches: ${String(e)}`);
        errors++;
        continue;
      }
    }

    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(matchContent) as unknown;
    } catch {
      console.error(`  ERROR parsing matches JSON`);
      errors++;
      continue;
    }

    const { records: matches, errors: parseErrors } = parseMatchRecords(parsedRaw);
    if (parseErrors.length > 0) {
      console.warn(`  ${parseErrors.length} match record(s) failed validation`);
    }
    console.log(`  ${matches.length} matches found`);

    const eventsDir = join(dataDir, "data", "events");
    ensureDir(eventsDir);

    for (const match of matches) {
      const eventFilePath = join(eventsDir, `${match.match_id}.json`);

      if (shouldSkip(eventFilePath)) {
        skipped++;
        continue;
      }

      const eventsUrl = `${STATSBOMB_RAW_BASE}/data/events/${match.match_id}.json`;
      try {
        const eventsContent = await downloadText(eventsUrl);
        writeFileSync(eventFilePath, eventsContent, "utf-8");
        eventsDownloaded++;
        matchesDownloaded++;
        process.stdout.write(".");
      } catch (e) {
        console.error(`\n  ERROR downloading events for match ${match.match_id}: ${String(e)}`);
        errors++;
      }
    }
    if (matches.length > 0) console.log();
  }

  console.log("\n--- Download Summary ---");
  console.log(`Competitions match files downloaded: ${competitionsDownloaded}`);
  console.log(`Event files downloaded: ${eventsDownloaded} (${matchesDownloaded} matches)`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Data directory: ${dataDir}`);

  if (errors > 0) {
    console.error(`\n${errors} error(s) occurred. Check output above.`);
    process.exit(1);
  }
}

run().catch((e: unknown) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
