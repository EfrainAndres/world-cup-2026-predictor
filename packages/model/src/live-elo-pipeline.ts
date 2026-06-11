import { DEFAULT_ELO_CONFIG, getCurrentTeamRatings, processMatches } from "./elo.js";
import type { EloConfig, EloMatch, LiveEloDataCoverage, LiveEloPipelineInput, LiveEloPipelineResult, LiveEloRankedEntry } from "./types.js";

export const LIVE_ELO_PIPELINE_VERSION = "live-elo-pipeline-foundation-v1";
export const LIVE_ELO_PIPELINE_FOUNDATION_WARNING =
  "Live Elo ratings are computed from available World Cup fixture data only. They are not calibrated from full international match history.";
export const LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING =
  "Some teams have fewer than 3 matches in the available dataset. Their Elo ratings may be unreliable.";
export const LIVE_ELO_PIPELINE_NO_MATCHES_WARNING =
  "No matches were provided. All teams default to the initial Elo rating.";

function sortMatchesChronologically(matches: readonly EloMatch[]): EloMatch[] {
  return [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date) || a.match_id.localeCompare(b.match_id));
}

function countMatchesPerTeam(matches: readonly EloMatch[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const match of matches) {
    counts.set(match.home_team, (counts.get(match.home_team) ?? 0) + 1);
    counts.set(match.away_team, (counts.get(match.away_team) ?? 0) + 1);
  }

  return counts;
}

function getLatestMatchDate(matches: readonly EloMatch[]): string | undefined {
  if (matches.length === 0) {
    return undefined;
  }

  let latest: string | undefined;

  for (const match of matches) {
    if (latest === undefined || match.match_date > latest) {
      latest = match.match_date;
    }
  }

  return latest;
}

function resolveConfig(partial: Partial<EloConfig> | undefined): EloConfig {
  return {
    initialRating: partial?.initialRating ?? DEFAULT_ELO_CONFIG.initialRating,
    kFactor: partial?.kFactor ?? DEFAULT_ELO_CONFIG.kFactor
  };
}

export function runLiveEloPipeline(input: LiveEloPipelineInput): LiveEloPipelineResult {
  if (input.pipelineId.trim().length === 0) {
    throw new Error("pipelineId is required.");
  }

  const config = resolveConfig(input.config);
  const sortedMatches = sortMatchesChronologically(input.matches);
  const matchCounts = countMatchesPerTeam(input.matches);
  const dataCoverage: LiveEloDataCoverage = input.dataCoverage ?? "world_cup_fixtures_only";

  const processResult = processMatches(sortedMatches, config);
  const rankedEntries = getCurrentTeamRatings(processResult.ratings);

  const warnings: string[] = [];

  if (dataCoverage !== "complete_international_history") {
    warnings.push(LIVE_ELO_PIPELINE_FOUNDATION_WARNING);
  }

  if (input.matches.length === 0) {
    warnings.push(LIVE_ELO_PIPELINE_NO_MATCHES_WARNING);
  }

  const sparseTeamCount = rankedEntries.filter((e) => (matchCounts.get(e.team) ?? 0) < 3).length;

  if (sparseTeamCount > 0) {
    warnings.push(LIVE_ELO_PIPELINE_SPARSE_DATA_WARNING);
  }

  const rankedRatings: LiveEloRankedEntry[] = rankedEntries.map((entry, index) => ({
    rank: index + 1,
    team: entry.team,
    eloRating: entry.rating,
    matchesPlayed: matchCounts.get(entry.team) ?? 0
  }));

  return {
    pipelineId: input.pipelineId,
    pipelineVersion: LIVE_ELO_PIPELINE_VERSION,
    rankedRatings,
    matchesProcessed: sortedMatches.length,
    teamsRated: rankedRatings.length,
    latestMatchDate: getLatestMatchDate(input.matches),
    dataCoverage,
    warnings
  };
}
