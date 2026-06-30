import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { classifyLiveEloCompetition } from "../../model/src/index.js";
import type { LiveEloCompetitionWeightCategory } from "../../model/src/index.js";
import { canonicalizeTeamName } from "./team-aliases.js";
import { loadLiveEloInternationalSupplement } from "./live-elo-data.js";

export type ExistingCompetitionWeightKey = LiveEloCompetitionWeightCategory;

export interface HistoricalInternationalScoredFixture {
  fixtureId: string;
  kickoffAt: string;
  competitionId: string;
  season?: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  neutralVenue: boolean;
  competitionWeightKey: ExistingCompetitionWeightKey;
  sourceId: string;
  stage?: string;
}

export type HistoricalInternationalFixtureMode = "legacy_phase_12_21a" | "expanded";

export const HISTORICAL_INTERNATIONAL_FIXTURE_SCHEMA_VERSION = "1.0.0" as const;
export const HISTORICAL_INTERNATIONAL_SOURCE_ID_WORLD_CUP = "curated_world_cup_results" as const;
export const HISTORICAL_INTERNATIONAL_SOURCE_ID_LIVE_ELO_SUPPLEMENT = "live_elo_expanded_international_supplement" as const;
export const HISTORICAL_INTERNATIONAL_WORLD_CUP_YEARS = [2010, 2014, 2018, 2022] as const;
export const HISTORICAL_INTERNATIONAL_LEGACY_WORLD_CUP_YEARS = [2018, 2022] as const;

interface WcFixtureFile {
  matches?: unknown[];
}

interface RawWcMatch {
  match_id?: unknown;
  tournament_year?: unknown;
  stage?: unknown;
  match_date?: unknown;
  home_team?: unknown;
  away_team?: unknown;
  home_score?: unknown;
  away_score?: unknown;
  neutral_site?: unknown;
}

function findWorldCupFixturesDir(): string {
  const candidates = [
    join(process.cwd(), "../../packages/data/fixtures/world-cup"),
    join(process.cwd(), "packages/data/fixtures/world-cup"),
    join(import.meta.dirname ?? "", "../../data/fixtures/world-cup"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return join(process.cwd(), "packages/data/fixtures/world-cup");
}

function isoDateToNoonUtc(date: string): string {
  return `${date.slice(0, 10)}T12:00:00.000Z`;
}

export function mapHistoricalCompetitionToWeightKey(
  competition: string,
  fixtureId = ""
): ExistingCompetitionWeightKey {
  const normalizedFixtureId = fixtureId.toUpperCase();
  if (/-(WC|WC22)-/.test(normalizedFixtureId) || normalizedFixtureId.includes("-WC22-")) {
    return "fifa_world_cup";
  }
  if (normalizedFixtureId.includes("-WCQ")) {
    return "world_cup_qualifier";
  }
  if (normalizedFixtureId.includes("-COPA") || normalizedFixtureId.includes("-EURO")) {
    return "continental_championship";
  }
  if (normalizedFixtureId.includes("-FRI")) {
    return "international_friendly";
  }

  return classifyLiveEloCompetition({
    match_id: fixtureId,
    match_date: "2000-01-01",
    home_team: "Home",
    away_team: "Away",
    neutral_site: true,
    competition,
    result: "draw"
  });
}

function toWorldCupFixture(raw: RawWcMatch, year: number): HistoricalInternationalScoredFixture | null {
  if (
    typeof raw.match_id !== "string" ||
    typeof raw.match_date !== "string" ||
    typeof raw.home_team !== "string" ||
    typeof raw.away_team !== "string" ||
    typeof raw.home_score !== "number" ||
    typeof raw.away_score !== "number"
  ) {
    return null;
  }

  const competition = "FIFA World Cup";

  return {
    fixtureId: raw.match_id,
    kickoffAt: isoDateToNoonUtc(raw.match_date),
    competitionId: competition,
    season: String(year),
    homeTeam: canonicalizeTeamName(raw.home_team),
    awayTeam: canonicalizeTeamName(raw.away_team),
    homeGoals: raw.home_score,
    awayGoals: raw.away_score,
    neutralVenue: raw.neutral_site === true,
    competitionWeightKey: mapHistoricalCompetitionToWeightKey(competition, raw.match_id),
    sourceId: HISTORICAL_INTERNATIONAL_SOURCE_ID_WORLD_CUP,
    stage: typeof raw.stage === "string" ? raw.stage : "unknown"
  };
}

function loadWorldCupScoredFixtures(input: {
  years: readonly number[];
  fixturesDir?: string;
}): HistoricalInternationalScoredFixture[] {
  const dir = input.fixturesDir ?? findWorldCupFixturesDir();
  const fixtures: HistoricalInternationalScoredFixture[] = [];

  for (const year of input.years) {
    const path = join(dir, `world-cup-${year}-results.json`);
    if (!existsSync(path)) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    } catch {
      continue;
    }

    const file = parsed as WcFixtureFile;
    if (!Array.isArray(file.matches)) continue;

    for (const raw of file.matches as RawWcMatch[]) {
      const fixture = toWorldCupFixture(raw, year);
      if (fixture !== null) fixtures.push(fixture);
    }
  }

  return fixtures;
}

function loadSupplementScoredFixtures(): HistoricalInternationalScoredFixture[] {
  const supplement = loadLiveEloInternationalSupplement();

  return supplement.matches
    .filter((match) => match.home_score !== undefined && match.away_score !== undefined)
    .map((match): HistoricalInternationalScoredFixture => {
      const competition = match.competition ?? "International match";
      return {
        fixtureId: match.match_id,
        kickoffAt: isoDateToNoonUtc(match.match_date),
        competitionId: competition,
        season: match.match_date.slice(0, 4),
        homeTeam: canonicalizeTeamName(match.home_team),
        awayTeam: canonicalizeTeamName(match.away_team),
        homeGoals: match.home_score ?? 0,
        awayGoals: match.away_score ?? 0,
        neutralVenue: match.neutral_site === true,
        competitionWeightKey: mapHistoricalCompetitionToWeightKey(competition, match.match_id),
        sourceId: supplement.metadata.datasetId || HISTORICAL_INTERNATIONAL_SOURCE_ID_LIVE_ELO_SUPPLEMENT,
        stage: "supplement"
      };
    });
}

export function loadHistoricalInternationalScoredFixtures(input: {
  mode?: HistoricalInternationalFixtureMode;
  fixturesDir?: string;
} = {}): HistoricalInternationalScoredFixture[] {
  const mode = input.mode ?? "expanded";
  const years =
    mode === "legacy_phase_12_21a"
      ? HISTORICAL_INTERNATIONAL_LEGACY_WORLD_CUP_YEARS
      : HISTORICAL_INTERNATIONAL_WORLD_CUP_YEARS;

  const worldCupInput =
    input.fixturesDir === undefined
      ? { years }
      : { years, fixturesDir: input.fixturesDir };

  return [
    ...loadWorldCupScoredFixtures(worldCupInput),
    ...loadSupplementScoredFixtures()
  ].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt) || a.fixtureId.localeCompare(b.fixtureId));
}
