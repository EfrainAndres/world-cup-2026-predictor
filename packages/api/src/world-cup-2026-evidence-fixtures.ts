import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import {
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  WORLD_CUP_2026_TEAM_NAMES
} from "./world-cup-2026-teams.js";
import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026Fixture
} from "./schemas.js";

export type WorldCup2026EvidenceStage =
  | "group_stage"
  | "round_of_32"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final";

export type WorldCup2026EvidenceFixtureSource = "group_static" | "provider_knockout";

export interface WorldCup2026EvidenceFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  group?: string;
  matchday?: number;
  order?: number;
  groupFixtureOrder?: number;
  status?: WorldCup2026Fixture["status"];
  dateStatus?: WorldCup2026Fixture["dateStatus"];
  venueStatus?: WorldCup2026Fixture["venueStatus"];
}

export interface ResolvedWorldCup2026EvidenceFixture {
  fixture: WorldCup2026EvidenceFixture;
  source: WorldCup2026EvidenceFixtureSource;
  stage: WorldCup2026EvidenceStage;
}

export interface UnresolvedWorldCup2026EvidenceFixture {
  issueCode: "unresolved_teams" | "unsupported_fixture_stage" | "invalid_fixture_identity";
}

const KNOWN_TEAM_KEYS = new Set(WORLD_CUP_2026_TEAM_NAMES.map((team) => teamKey(team)));

function teamKey(value: string): string {
  return normalizeTeamSearchText(canonicalizeTeamName(value));
}

function canonicalKnownTeam(value: string): string | undefined {
  const canonical = canonicalizeTeamName(value);
  return KNOWN_TEAM_KEYS.has(teamKey(canonical)) ? canonical : undefined;
}

function slug(value: string): string {
  return normalizeTeamSearchText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeStageText(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function classifyWorldCup2026EvidenceStage(
  record: Pick<WorldCup2026ExternalFixtureRecord, "stage" | "group" | "matchday">
): WorldCup2026EvidenceStage | null {
  if (record.group !== undefined && record.group.trim().length > 0) return "group_stage";

  const stage = normalizeStageText(record.stage);
  if (stage.includes("third_place") || stage.includes("third_placed") || stage.includes("bronze") || stage.includes("3rd_place")) {
    return "third_place";
  }
  if (stage.includes("semi_final") || stage.includes("semifinal") || stage.includes("semi_finals")) {
    return "semifinal";
  }
  if (stage.includes("quarter_final") || stage.includes("quarterfinal") || stage.includes("quarter_finals")) {
    return "quarterfinal";
  }
  if (stage.includes("round_of_16") || stage.includes("last_16") || stage.includes("round_16")) {
    return "round_of_16";
  }
  if (stage.includes("round_of_32") || stage.includes("last_32") || stage.includes("round_32")) {
    return "round_of_32";
  }
  if (stage === "final" || stage.endsWith("_final") || stage.includes("finals")) {
    return "final";
  }
  if (stage.includes("group")) return "group_stage";

  const matchday = record.matchday;
  if (matchday === undefined) return null;
  if (matchday >= 73 && matchday <= 88) return "round_of_32";
  if (matchday >= 89 && matchday <= 96) return "round_of_16";
  if (matchday >= 97 && matchday <= 100) return "quarterfinal";
  if (matchday >= 101 && matchday <= 102) return "semifinal";
  if (matchday === 103) return "third_place";
  if (matchday === 104) return "final";
  if (matchday >= 1 && matchday <= 72) return "group_stage";

  return null;
}

function resolveGroupFixture(record: WorldCup2026ExternalFixtureRecord): WorldCup2026Fixture | undefined {
  const byId = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((fixture) => fixture.id === record.providerFixtureId);
  if (byId !== undefined) return byId;

  const home = teamKey(record.homeTeam);
  const away = teamKey(record.awayTeam);
  return WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find(
    (fixture) =>
      (teamKey(fixture.homeTeam) === home && teamKey(fixture.awayTeam) === away) ||
      (teamKey(fixture.homeTeam) === away && teamKey(fixture.awayTeam) === home)
  );
}

function buildKnockoutFixtureId(record: WorldCup2026ExternalFixtureRecord, stage: WorldCup2026EvidenceStage): string {
  const providerKey = record.providerFixtureId.trim().length > 0
    ? slug(record.providerFixtureId)
    : slug(`${stage}-${record.homeTeam}-vs-${record.awayTeam}-${record.kickoffAt ?? "no-kickoff"}`);
  return `wc2026-knockout-${stage}-${providerKey}`;
}

export function resolveWorldCup2026EvidenceFixture(
  record: WorldCup2026ExternalFixtureRecord
): ResolvedWorldCup2026EvidenceFixture | UnresolvedWorldCup2026EvidenceFixture {
  const stage = classifyWorldCup2026EvidenceStage(record);
  const groupFixture = resolveGroupFixture(record);
  if (groupFixture !== undefined) {
    return { fixture: groupFixture, source: "group_static", stage: "group_stage" };
  }

  if (stage === "group_stage") {
    const home = canonicalKnownTeam(record.homeTeam);
    const away = canonicalKnownTeam(record.awayTeam);
    return home === undefined || away === undefined
      ? { issueCode: "unresolved_teams" }
      : { issueCode: "invalid_fixture_identity" };
  }

  if (stage === null) {
    return { issueCode: "unsupported_fixture_stage" };
  }

  const homeTeam = canonicalKnownTeam(record.homeTeam);
  const awayTeam = canonicalKnownTeam(record.awayTeam);
  if (homeTeam === undefined || awayTeam === undefined || homeTeam === awayTeam) {
    return { issueCode: "unresolved_teams" };
  }

  return {
    source: "provider_knockout",
    stage,
    fixture: {
      id: buildKnockoutFixtureId(record, stage),
      homeTeam,
      awayTeam,
      ...(record.matchday === undefined ? {} : { matchday: record.matchday }),
      status: "scheduled",
      dateStatus: "deferred",
      venueStatus: "deferred"
    }
  };
}

export function isSupportedWorldCup2026EvidenceSnapshotFixture(input: {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
}): boolean {
  if (WORLD_CUP_2026_GROUP_STAGE_FIXTURES.some((fixture) => fixture.id === input.fixtureId)) {
    return true;
  }

  if (!input.fixtureId.startsWith("wc2026-knockout-")) return false;
  const homeTeam = canonicalKnownTeam(input.homeTeam);
  const awayTeam = canonicalKnownTeam(input.awayTeam);
  return homeTeam !== undefined && awayTeam !== undefined && homeTeam !== awayTeam;
}

export function evidenceTeamKey(value: string): string {
  return teamKey(value);
}
