import { pathToFileURL } from "node:url";
import { predictMatchFromLiveElo } from "../packages/api/src/routes.ts";
import { createAttackDefenseProductionDependencies } from "../packages/api/src/attack-defense-server-composition.ts";
import { createProductionPredictionDependencies } from "../packages/api/src/statsbomb-server-composition.ts";
import { embeddedAttackDefenseSelectedCandidateArtifact } from "../apps/web/src/lib/attack-defense-embedded-artifact.server.ts";

const MATCHUPS = [
  { homeTeam: "Brazil", awayTeam: "Japan" },
  { homeTeam: "Algeria", awayTeam: "Argentina" },
  { homeTeam: "Brazil", awayTeam: "Haiti" },
  { homeTeam: "Argentina", awayTeam: "France" },
  { homeTeam: "Brazil", awayTeam: "Morocco" },
  { homeTeam: "Costa Rica", awayTeam: "Brazil" },
  { homeTeam: "England", awayTeam: "Germany" },
  { homeTeam: "Saudi Arabia", awayTeam: "Haiti" },
] as const;

type Mode = "baseline_only" | "ad_only" | "ad_sb_shadow" | "ad_sb_on";

const MODES: Mode[] = ["baseline_only", "ad_only", "ad_sb_shadow", "ad_sb_on"];

interface BatchRow {
  homeTeam: string;
  awayTeam: string;
  mode: Mode;
  homeXg: number;
  awayXg: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  recommendedScore: string;
  adApplied: boolean;
  sbApplied: boolean;
  adMode: string;
  sbMode: string;
}

function buildDeps(mode: Mode) {
  if (mode === "baseline_only") {
    return undefined;
  }

  const adEnv: Record<string, string> = { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" };
  const adDeps = createAttackDefenseProductionDependencies({
    env: adEnv,
    selectedCandidateArtifact: embeddedAttackDefenseSelectedCandidateArtifact,
  });

  let sbEnvMode = "off";
  if (mode === "ad_sb_shadow") sbEnvMode = "shadow";
  if (mode === "ad_sb_on") sbEnvMode = "on";

  const sbDeps = createProductionPredictionDependencies({
    env: { STATSBOMB_PREDICTION_SIGNAL_MODE: sbEnvMode },
  });

  return { ...sbDeps, ...adDeps };
}

function runRow(matchup: { homeTeam: string; awayTeam: string }, mode: Mode): BatchRow {
  const deps = buildDeps(mode);
  const result = predictMatchFromLiveElo(
    { homeTeam: matchup.homeTeam, awayTeam: matchup.awayTeam },
    deps
  );

  if (result.status !== "success") {
    return {
      homeTeam: matchup.homeTeam,
      awayTeam: matchup.awayTeam,
      mode,
      homeXg: 0,
      awayXg: 0,
      homeWinPct: 0,
      drawPct: 0,
      awayWinPct: 0,
      recommendedScore: "N/A",
      adApplied: false,
      sbApplied: false,
      adMode: "N/A",
      sbMode: "N/A",
    };
  }

  const recommended = result.scorelinePresentation?.recommendedScore ?? result.mostLikelyScorelines[0];
  const recommendedScore =
    recommended !== undefined
      ? `${recommended.homeGoals}-${recommended.awayGoals}`
      : "?";

  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  return {
    homeTeam: result.liveElo.homeTeam,
    awayTeam: result.liveElo.awayTeam,
    mode,
    homeXg: round4(result.expectedGoals.home),
    awayXg: round4(result.expectedGoals.away),
    homeWinPct: round4(result.outcomeProbabilities.homeWinProbability * 100),
    drawPct: round4(result.outcomeProbabilities.drawProbability * 100),
    awayWinPct: round4(result.outcomeProbabilities.awayWinProbability * 100),
    recommendedScore,
    adApplied: result.attackDefenseGoalModel?.applied ?? false,
    sbApplied: result.statsBombSignal?.applied ?? false,
    adMode: result.attackDefenseGoalModel?.mode ?? "off",
    sbMode: result.statsBombSignal?.rolloutMode ?? "off",
  };
}

function formatMarkdown(rows: BatchRow[]): string {
  const lines: string[] = [
    "# Prediction Batch Comparison",
    "",
    `Generated rows: ${rows.length} (${MATCHUPS.length} matchups × ${MODES.length} modes)`,
    "",
    "| Home | Away | Mode | Home xG | Away xG | HW% | D% | AW% | Score | AD | SB |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.homeTeam} | ${row.awayTeam} | ${row.mode} | ${row.homeXg} | ${row.awayXg} | ${row.homeWinPct} | ${row.drawPct} | ${row.awayWinPct} | ${row.recommendedScore} | ${row.adApplied ? "✓" : "—"} | ${row.sbApplied ? "✓" : "—"} |`
    );
  }

  return lines.join("\n");
}

function log(msg = ""): void {
  process.stdout.write(msg + "\n");
}

function isCliEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const format = args.includes("--format") ? args[args.indexOf("--format") + 1] : "json";

  const rows: BatchRow[] = [];
  for (const matchup of MATCHUPS) {
    for (const mode of MODES) {
      rows.push(runRow(matchup, mode));
    }
  }

  if (format === "markdown") {
    log(formatMarkdown(rows));
  } else {
    log(JSON.stringify(rows, null, 2));
  }
}

if (isCliEntrypoint()) {
  main().catch((error) => {
    process.stderr.write(`[prediction:batch-compare] Fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
