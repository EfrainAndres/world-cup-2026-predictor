import { createSeededRandom } from "./simulation.js";
import { simulateTournament } from "./tournament.js";
import type {
  RandomFunction,
  SimulatedTournamentResult,
  TournamentInput,
  TournamentRepeatedRunsConfig,
  TournamentRepeatedRunsMetadata,
  TournamentRepeatedRunsResult,
  TournamentTeamProbabilitySummary
} from "./types.js";

export const DEFAULT_TOURNAMENT_RUNS_MAX = 10_000;

function validateRunCount(runCount: number, maxRunCount: number): void {
  if (!Number.isInteger(runCount) || runCount < 1) {
    throw new Error("runCount must be a positive integer.");
  }

  if (!Number.isInteger(maxRunCount) || maxRunCount < 1) {
    throw new Error("maxRunCount must be a positive integer.");
  }

  if (runCount > maxRunCount) {
    throw new Error(`runCount must be ${maxRunCount} or less.`);
  }
}

function getRandomFunction(config: TournamentRepeatedRunsConfig): RandomFunction | undefined {
  if (config.random !== undefined) {
    return config.random;
  }

  if (config.seed !== undefined) {
    return createSeededRandom(config.seed);
  }

  return undefined;
}

function incrementCount(counts: Map<string, number>, team: string): void {
  counts.set(team, (counts.get(team) ?? 0) + 1);
}

export function summarizeTeamCounts(counts: ReadonlyMap<string, number>, totalRuns: number): TournamentTeamProbabilitySummary[] {
  validateRunCount(totalRuns, Number.MAX_SAFE_INTEGER);

  return [...counts.entries()]
    .map(([team, count]) => ({
      team,
      count,
      probability: count / totalRuns
    }))
    .sort((a, b) => b.probability - a.probability || a.team.localeCompare(b.team));
}

function collectTournamentRun(
  result: SimulatedTournamentResult,
  championCounts: Map<string, number>,
  runnerUpCounts: Map<string, number>,
  knockoutQualificationCounts: Map<string, number>,
  groupQualificationCounts: Map<string, number>
): void {
  incrementCount(championCounts, result.champion);
  incrementCount(runnerUpCounts, result.runnerUp);

  for (const group of result.groupResults) {
    for (const qualifier of group.qualifiers) {
      incrementCount(groupQualificationCounts, qualifier.team);
      incrementCount(knockoutQualificationCounts, qualifier.team);
    }
  }
}

function buildMetadata(input: TournamentInput, config: TournamentRepeatedRunsConfig, maxRunCount: number): TournamentRepeatedRunsMetadata {
  const metadata: TournamentRepeatedRunsMetadata = {
    tournamentName: input.name,
    totalRuns: config.runCount,
    maxRunCount,
    format: "Repeated runs of the simplified tournament simulation",
    notes: [
      "Probabilities are count divided by total runs.",
      "This is not full FIFA World Cup 2026 format support.",
      "Results depend on the input match probability matrices and tournament assumptions."
    ]
  };

  if (config.seed !== undefined) {
    metadata.seed = config.seed;
  }

  return metadata;
}

export function runTournamentRepeatedRuns(input: TournamentInput, config: TournamentRepeatedRunsConfig): TournamentRepeatedRunsResult {
  const maxRunCount = config.maxRunCount ?? DEFAULT_TOURNAMENT_RUNS_MAX;
  validateRunCount(config.runCount, maxRunCount);

  const random = getRandomFunction(config);
  const championCounts = new Map<string, number>();
  const runnerUpCounts = new Map<string, number>();
  const knockoutQualificationCounts = new Map<string, number>();
  const groupQualificationCounts = new Map<string, number>();

  for (let runIndex = 0; runIndex < config.runCount; runIndex += 1) {
    const result = simulateTournament(input, random === undefined ? undefined : { random });
    collectTournamentRun(result, championCounts, runnerUpCounts, knockoutQualificationCounts, groupQualificationCounts);
  }

  return {
    totalRuns: config.runCount,
    championProbabilities: summarizeTeamCounts(championCounts, config.runCount),
    runnerUpProbabilities: summarizeTeamCounts(runnerUpCounts, config.runCount),
    knockoutQualificationProbabilities: summarizeTeamCounts(knockoutQualificationCounts, config.runCount),
    groupQualificationProbabilities: summarizeTeamCounts(groupQualificationCounts, config.runCount),
    metadata: buildMetadata(input, config, maxRunCount)
  };
}
