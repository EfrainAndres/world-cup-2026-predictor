import type {
  PredictMatchFromLiveEloRequest,
  PredictMatchFromLiveEloResponse,
  PredictMatchFromLiveEloSuccessResponse,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026ExternalMatchStatus,
  WorldCup2026SyncResult
} from "./schemas.js";
import { buildApiMetadata } from "./schemas.js";
import { predictMatchFromLiveElo } from "./routes.js";
import { CURRENT_FORMULA_VERSION, CURRENT_MODEL_VERSION } from "./projection-refresh-policy.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "./world-cup-2026-teams.js";

export type OfficialKnockoutStage =
  | "round_of_32"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final";

export type OfficialKnockoutSourceState =
  | "official_fixture"
  | "official_result"
  | "projected_participants"
  | "projected_result"
  | "mixed_official_projected"
  | "unresolved";

export type KnockoutParticipantState =
  | "official_participant"
  | "official_winner"
  | "official_loser"
  | "projected_winner"
  | "projected_loser"
  | "unresolved";

export type KnockoutParticipantSource =
  | { kind: "official_team"; team: string }
  | { kind: "winner_of"; matchNumber: number }
  | { kind: "loser_of"; matchNumber: number }
  | { kind: "unresolved" };

export type KnockoutAdvancementMethod =
  | "official_regulation"
  | "official_extra_time"
  | "official_penalties"
  | "projected_regulation"
  | "projected_extra_time"
  | "projected_penalties";

export interface KnockoutDownstreamDestination {
  matchNumber: number;
  slot: "home" | "away";
  participant: "winner" | "loser";
}

export interface OfficialKnockoutTopologyMatch {
  matchNumber: number;
  stage: OfficialKnockoutStage;
  bracketSlot: number;
  homeSource: KnockoutParticipantSource;
  awaySource: KnockoutParticipantSource;
  downstream: readonly KnockoutDownstreamDestination[];
}

export interface OfficialRoundOf32FixtureProvenance {
  participantSource: "canonical_official_fixture";
  sourceName: string;
  asOf: string;
  notes?: string;
}

export interface OfficialRoundOf32FixtureFoundation {
  fixtureId: string;
  officialMatchNumber: number;
  bracketSlot: number;
  homeTeam: string;
  awayTeam: string;
  provenance: OfficialRoundOf32FixtureProvenance;
  kickoffAt?: string;
  venue?: string;
  providerFixtureId?: string;
}

export interface OfficialKnockoutParticipant {
  team?: string;
  source: KnockoutParticipantSource;
  state: KnockoutParticipantState;
  upstreamMatchNumber?: number;
  path: readonly number[];
}

export interface OfficialKnockoutProjectionData {
  expectedGoals: {
    home: number;
    away: number;
  };
  outcomeProbabilities: PredictMatchFromLiveEloSuccessResponse["outcomeProbabilities"];
  mostLikelyScoreline: {
    homeGoals: number;
    awayGoals: number;
    probability: number;
  };
  confidence: PredictMatchFromLiveEloSuccessResponse["predictionConfidence"];
  coverageType: PredictMatchFromLiveEloSuccessResponse["predictionConfidence"]["coverageType"];
  formulaVersion: string;
  homeEloRating: number;
  awayEloRating: number;
}

export interface OfficialKnockoutScore {
  homeGoals: number;
  awayGoals: number;
}

export interface OfficialKnockoutFixtureProjection {
  fixtureId: string;
  officialMatchNumber: number;
  stage: OfficialKnockoutStage;
  bracketSlot: number;
  kickoffAt?: string;
  home: OfficialKnockoutParticipant;
  away: OfficialKnockoutParticipant;
  sourceState: OfficialKnockoutSourceState;
  status: WorldCup2026ExternalMatchStatus | "scheduled" | "unavailable";
  sourceClassification: "canonical_static_official_fixture" | "provider_official_fixture" | "provider_official_result" | "projected";
  provenance?: OfficialRoundOf32FixtureProvenance;
  providerFixtureId?: string;
  officialScore?: OfficialKnockoutScore;
  officialPenaltyScore?: OfficialKnockoutScore;
  projectedScore?: OfficialKnockoutScore;
  projection?: OfficialKnockoutProjectionData;
  winner?: OfficialKnockoutParticipant;
  loser?: OfficialKnockoutParticipant;
  advancementMethod?: KnockoutAdvancementMethod;
  advancementReason?: string;
  upstreamSources: {
    home: KnockoutParticipantSource;
    away: KnockoutParticipantSource;
  };
  downstream: readonly KnockoutDownstreamDestination[];
  warnings: readonly string[];
}

export type OfficialKnockoutPodiumResolution = "official" | "projected" | "unresolved";

export interface OfficialKnockoutPodiumEntry {
  team?: string;
  resolution: OfficialKnockoutPodiumResolution;
}

export interface OfficialKnockoutPodium {
  champion: OfficialKnockoutPodiumEntry;
  runnerUp: OfficialKnockoutPodiumEntry;
  thirdPlace: OfficialKnockoutPodiumEntry;
  fourthPlace: OfficialKnockoutPodiumEntry;
}

export interface OfficialKnockoutProjectionMetadata {
  generatedAt: string;
  sourceSynchronizationAt?: string;
  canonicalFixtureAsOf: string;
  modelVersion: string;
  formulaVersion: string;
  providerFallbackUsed: boolean;
  predictorCallCount: number;
  metadata: ReturnType<typeof buildApiMetadata>;
}

export interface OfficialKnockoutProjectionResult {
  status: "success";
  tournamentName: "FIFA World Cup 2026";
  dataScope: "world_cup_2026_official_knockout_projection";
  matches: readonly OfficialKnockoutFixtureProjection[];
  rounds: Record<OfficialKnockoutStage, readonly OfficialKnockoutFixtureProjection[]>;
  podium: OfficialKnockoutPodium;
  warnings: readonly string[];
  validationWarnings: readonly string[];
  matchingIssues: readonly string[];
  metadata: OfficialKnockoutProjectionMetadata;
}

export interface BuildOfficialWorldCup2026KnockoutProjectionInput {
  syncResult?: WorldCup2026SyncResult;
  generatedAt?: string;
  predictMatch?: (request: PredictMatchFromLiveEloRequest) => PredictMatchFromLiveEloResponse;
}

interface ProviderMatchResult {
  record: WorldCup2026ExternalFixtureRecord;
  orientation: "canonical" | "reversed";
  method: "provider_fixture_id" | "official_match_number" | "teams" | "reversed_teams" | "round_participant_overlap";
}

interface ResolvedMatchRecord {
  match: OfficialKnockoutFixtureProjection;
  winner?: OfficialKnockoutParticipant;
  loser?: OfficialKnockoutParticipant;
}

const OFFICIAL_ROUND_OF_32_FIXTURE_AS_OF = "2026-06-28T00:00:00.000Z";
const OFFICIAL_ROUND_OF_32_PROVENANCE: OfficialRoundOf32FixtureProvenance = {
  participantSource: "canonical_official_fixture",
  sourceName: "Project-maintained confirmed World Cup 2026 Round-of-32 fixture list",
  asOf: OFFICIAL_ROUND_OF_32_FIXTURE_AS_OF,
  notes: "Kickoff timestamps, venues, and provider fixture IDs are intentionally omitted until confirmed in normalized provider data."
};
const PROJECTION_TIE_EPSILON = 0.000001;

function officialTeam(team: string): KnockoutParticipantSource {
  return { kind: "official_team", team };
}

function winnerOf(matchNumber: number): KnockoutParticipantSource {
  return { kind: "winner_of", matchNumber };
}

function loserOf(matchNumber: number): KnockoutParticipantSource {
  return { kind: "loser_of", matchNumber };
}

export const WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES = [
  {
    fixtureId: "wc2026-match-73-south-africa-vs-canada",
    officialMatchNumber: 73,
    bracketSlot: 1,
    homeTeam: "South Africa",
    awayTeam: "Canada",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-74-brazil-vs-japan",
    officialMatchNumber: 74,
    bracketSlot: 2,
    homeTeam: "Brazil",
    awayTeam: "Japan",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-75-germany-vs-paraguay",
    officialMatchNumber: 75,
    bracketSlot: 3,
    homeTeam: "Germany",
    awayTeam: "Paraguay",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-76-netherlands-vs-morocco",
    officialMatchNumber: 76,
    bracketSlot: 4,
    homeTeam: "Netherlands",
    awayTeam: "Morocco",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-77-ivory-coast-vs-norway",
    officialMatchNumber: 77,
    bracketSlot: 5,
    homeTeam: "Ivory Coast",
    awayTeam: "Norway",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-78-france-vs-sweden",
    officialMatchNumber: 78,
    bracketSlot: 6,
    homeTeam: "France",
    awayTeam: "Sweden",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-79-mexico-vs-ecuador",
    officialMatchNumber: 79,
    bracketSlot: 7,
    homeTeam: "Mexico",
    awayTeam: "Ecuador",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-80-england-vs-dr-congo",
    officialMatchNumber: 80,
    bracketSlot: 8,
    homeTeam: "England",
    awayTeam: "DR Congo",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-81-belgium-vs-senegal",
    officialMatchNumber: 81,
    bracketSlot: 9,
    homeTeam: "Belgium",
    awayTeam: "Senegal",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-82-united-states-vs-bosnia-herzegovina",
    officialMatchNumber: 82,
    bracketSlot: 10,
    homeTeam: "United States",
    awayTeam: "Bosnia-Herzegovina",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-83-spain-vs-austria",
    officialMatchNumber: 83,
    bracketSlot: 11,
    homeTeam: "Spain",
    awayTeam: "Austria",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-84-portugal-vs-croatia",
    officialMatchNumber: 84,
    bracketSlot: 12,
    homeTeam: "Portugal",
    awayTeam: "Croatia",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-85-switzerland-vs-algeria",
    officialMatchNumber: 85,
    bracketSlot: 13,
    homeTeam: "Switzerland",
    awayTeam: "Algeria",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-86-australia-vs-egypt",
    officialMatchNumber: 86,
    bracketSlot: 14,
    homeTeam: "Australia",
    awayTeam: "Egypt",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-87-argentina-vs-cape-verde",
    officialMatchNumber: 87,
    bracketSlot: 15,
    homeTeam: "Argentina",
    awayTeam: "Cape Verde",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  },
  {
    fixtureId: "wc2026-match-88-colombia-vs-ghana",
    officialMatchNumber: 88,
    bracketSlot: 16,
    homeTeam: "Colombia",
    awayTeam: "Ghana",
    provenance: OFFICIAL_ROUND_OF_32_PROVENANCE
  }
] as const satisfies readonly OfficialRoundOf32FixtureFoundation[];

const ROUND_OF_16_SOURCES = [
  [89, 73, 75],
  [90, 74, 77],
  [91, 76, 78],
  [92, 79, 80],
  [93, 83, 84],
  [94, 81, 82],
  [95, 86, 88],
  [96, 85, 87]
] as const;

const QUARTERFINAL_SOURCES = [
  [97, 89, 90],
  [98, 93, 94],
  [99, 91, 92],
  [100, 95, 96]
] as const;

const SEMIFINAL_SOURCES = [
  [101, 97, 98],
  [102, 99, 100]
] as const;

function buildDownstreamDestinations(matchNumber: number): readonly KnockoutDownstreamDestination[] {
  const destinations: KnockoutDownstreamDestination[] = [];

  for (const [target, home, away] of ROUND_OF_16_SOURCES) {
    if (matchNumber === home) destinations.push({ matchNumber: target, slot: "home", participant: "winner" });
    if (matchNumber === away) destinations.push({ matchNumber: target, slot: "away", participant: "winner" });
  }

  for (const [target, home, away] of QUARTERFINAL_SOURCES) {
    if (matchNumber === home) destinations.push({ matchNumber: target, slot: "home", participant: "winner" });
    if (matchNumber === away) destinations.push({ matchNumber: target, slot: "away", participant: "winner" });
  }

  for (const [target, home, away] of SEMIFINAL_SOURCES) {
    if (matchNumber === home) destinations.push({ matchNumber: target, slot: "home", participant: "winner" });
    if (matchNumber === away) destinations.push({ matchNumber: target, slot: "away", participant: "winner" });
  }

  if (matchNumber === 101) {
    destinations.push({ matchNumber: 104, slot: "home", participant: "winner" });
    destinations.push({ matchNumber: 103, slot: "home", participant: "loser" });
  }
  if (matchNumber === 102) {
    destinations.push({ matchNumber: 104, slot: "away", participant: "winner" });
    destinations.push({ matchNumber: 103, slot: "away", participant: "loser" });
  }

  return destinations;
}

export const WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY = [
  ...WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES.map((fixture) => ({
    matchNumber: fixture.officialMatchNumber,
    stage: "round_of_32" as const,
    bracketSlot: fixture.bracketSlot,
    homeSource: officialTeam(fixture.homeTeam),
    awaySource: officialTeam(fixture.awayTeam),
    downstream: buildDownstreamDestinations(fixture.officialMatchNumber)
  })),
  ...ROUND_OF_16_SOURCES.map(([matchNumber, home, away], index) => ({
    matchNumber,
    stage: "round_of_16" as const,
    bracketSlot: index + 1,
    homeSource: winnerOf(home),
    awaySource: winnerOf(away),
    downstream: buildDownstreamDestinations(matchNumber)
  })),
  ...QUARTERFINAL_SOURCES.map(([matchNumber, home, away], index) => ({
    matchNumber,
    stage: "quarterfinal" as const,
    bracketSlot: index + 1,
    homeSource: winnerOf(home),
    awaySource: winnerOf(away),
    downstream: buildDownstreamDestinations(matchNumber)
  })),
  ...SEMIFINAL_SOURCES.map(([matchNumber, home, away], index) => ({
    matchNumber,
    stage: "semifinal" as const,
    bracketSlot: index + 1,
    homeSource: winnerOf(home),
    awaySource: winnerOf(away),
    downstream: buildDownstreamDestinations(matchNumber)
  })),
  {
    matchNumber: 103,
    stage: "third_place" as const,
    bracketSlot: 1,
    homeSource: loserOf(101),
    awaySource: loserOf(102),
    downstream: []
  },
  {
    matchNumber: 104,
    stage: "final" as const,
    bracketSlot: 1,
    homeSource: winnerOf(101),
    awaySource: winnerOf(102),
    downstream: []
  }
] as const satisfies readonly OfficialKnockoutTopologyMatch[];

function stageForMatchNumber(matchNumber: number): OfficialKnockoutStage | null {
  if (matchNumber >= 73 && matchNumber <= 88) return "round_of_32";
  if (matchNumber >= 89 && matchNumber <= 96) return "round_of_16";
  if (matchNumber >= 97 && matchNumber <= 100) return "quarterfinal";
  if (matchNumber >= 101 && matchNumber <= 102) return "semifinal";
  if (matchNumber === 103) return "third_place";
  if (matchNumber === 104) return "final";
  return null;
}

function normalizeTeamKey(team: string): string {
  return normalizeTeamSearchText(canonicalizeTeamName(team));
}

function isCompletedStatus(status: WorldCup2026ExternalMatchStatus): boolean {
  return status === "finished";
}

function isNonCompletedTerminalStatus(status: WorldCup2026ExternalMatchStatus): boolean {
  return status === "postponed" || status === "cancelled";
}

function hasKnockoutStageSignal(record: WorldCup2026ExternalFixtureRecord): boolean {
  const stage = (record.stage ?? "").toLowerCase();
  return (
    stage.includes("knockout") ||
    stage.includes("last_32") ||
    stage.includes("round_of_32") ||
    stage.includes("last_16") ||
    stage.includes("round_of_16") ||
    stage.includes("quarter") ||
    stage.includes("semi") ||
    stage.includes("third") ||
    stage.includes("final")
  );
}

function isKnockoutRecord(record: WorldCup2026ExternalFixtureRecord): boolean {
  if (hasKnockoutStageSignal(record)) return true;
  return record.matchday !== undefined && record.matchday >= 73 && record.matchday <= 104;
}

function uniqueRecords(records: readonly WorldCup2026ExternalFixtureRecord[]): readonly WorldCup2026ExternalFixtureRecord[] {
  const seen = new Set<string>();
  const deduped: WorldCup2026ExternalFixtureRecord[] = [];
  for (const record of records) {
    const key = [
      record.providerFixtureId,
      record.matchday ?? "unknown",
      normalizeTeamKey(record.homeTeam),
      normalizeTeamKey(record.awayTeam),
      record.status
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
  }
  return deduped;
}

function hasResolvableOfficialWinnerEvidence(record: WorldCup2026ExternalFixtureRecord): boolean {
  if (record.winner !== undefined && record.winner.trim() !== "") return true;
  if (
    record.penaltyHomeScore !== undefined &&
    record.penaltyAwayScore !== undefined &&
    record.penaltyHomeScore !== record.penaltyAwayScore
  ) {
    return true;
  }
  return record.homeScore !== undefined && record.awayScore !== undefined && record.homeScore !== record.awayScore;
}

function providerRecordAuthority(record: WorldCup2026ExternalFixtureRecord): number {
  if (record.status === "finished" && hasResolvableOfficialWinnerEvidence(record)) return 5;
  if (record.status === "finished" && record.homeScore !== undefined && record.awayScore !== undefined) return 4;
  if (record.status === "live" || record.status === "halftime") return 3;
  if (record.status === "scheduled") return 2;
  return 1;
}

function providerRecordEssentialFingerprint(record: WorldCup2026ExternalFixtureRecord): string {
  const homeKey = normalizeTeamKey(record.homeTeam);
  const awayKey = normalizeTeamKey(record.awayTeam);
  const reversed = homeKey > awayKey;
  const teamPair = reversed ? [awayKey, homeKey] : [homeKey, awayKey];
  const scores = reversed ? [record.awayScore, record.homeScore] : [record.homeScore, record.awayScore];
  const penalties = reversed
    ? [record.penaltyAwayScore, record.penaltyHomeScore]
    : [record.penaltyHomeScore, record.penaltyAwayScore];
  const winnerKey = record.winner === undefined ? "" : normalizeTeamKey(record.winner);
  return [
    ...teamPair,
    ...scores.map((value) => value ?? ""),
    ...penalties.map((value) => value ?? ""),
    winnerKey,
    record.decisionMethod ?? "",
    record.status
  ].join("|");
}

function selectAuthoritativeRecord(
  candidates: readonly WorldCup2026ExternalFixtureRecord[],
  officialMatchNumber: number
): { record?: WorldCup2026ExternalFixtureRecord; conflict?: string } {
  if (candidates.length === 0) return {};
  if (candidates.length === 1) return { record: candidates[0]! };

  const topAuthority = Math.max(...candidates.map(providerRecordAuthority));
  const best = candidates.filter((record) => providerRecordAuthority(record) === topAuthority);
  if (best.length === 1) return { record: best[0]! };

  const fingerprints = new Set(best.map(providerRecordEssentialFingerprint));
  if (fingerprints.size === 1) {
    const stable = [...best].sort(
      (a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.providerFixtureId.localeCompare(b.providerFixtureId)
    );
    return { record: stable[0]! };
  }

  return {
    conflict: `Conflicting equal-authority provider records for official match ${officialMatchNumber} were rejected as ambiguous.`
  };
}

interface ProviderRecordLookup {
  match: ProviderMatchResult | null;
  ambiguity?: string;
}

interface ProviderParticipantResolution {
  home: OfficialKnockoutParticipant;
  away: OfficialKnockoutParticipant;
  warning?: string;
}

const WORLD_CUP_2026_TEAM_BY_KEY = new Map(
  WORLD_CUP_2026_TEAM_NAMES.map((team) => [normalizeTeamKey(team), team])
);

function isProviderPlaceholderTeam(value: string): boolean {
  const key = normalizeTeamSearchText(value);
  return (
    key.length === 0 ||
    key === "tbd" ||
    key === "tba" ||
    key === "to be determined" ||
    key === "to be confirmed" ||
    key === "unknown" ||
    key.startsWith("winner ") ||
    key.startsWith("winner of ") ||
    key.startsWith("loser ") ||
    key.startsWith("loser of ")
  );
}

function canonicalProviderTeam(value: string): string | undefined {
  if (isProviderPlaceholderTeam(value)) return undefined;
  return WORLD_CUP_2026_TEAM_BY_KEY.get(normalizeTeamKey(value));
}

function formatParticipantPair(homeTeam: string | undefined, awayTeam: string | undefined): string {
  return `${homeTeam ?? "unresolved"} vs ${awayTeam ?? "unresolved"}`;
}

function providerFixtureParticipantWarning(input: {
  code: "provider_fixture_participants_override_internal_topology" | "provider_fixture_participants_unresolved";
  matchNumber: number;
  stage: OfficialKnockoutStage;
  providerFixtureId: string;
  providerHomeTeam: string;
  providerAwayTeam: string;
  internalHomeTeam?: string;
  internalAwayTeam?: string;
}): string {
  return `${input.code}: match=${input.matchNumber} round=${input.stage} providerFixtureId=${input.providerFixtureId} providerTeams="${formatParticipantPair(input.providerHomeTeam, input.providerAwayTeam)}" internalDerivedTeams="${formatParticipantPair(input.internalHomeTeam, input.internalAwayTeam)}"`;
}

function resolveProviderFixtureParticipants(input: {
  topology: OfficialKnockoutTopologyMatch;
  providerMatch: ProviderMatchResult;
  internalHome: OfficialKnockoutParticipant;
  internalAway: OfficialKnockoutParticipant;
}): ProviderParticipantResolution | { warning: string } {
  const providerHomeTeam = canonicalProviderTeam(input.providerMatch.record.homeTeam);
  const providerAwayTeam = canonicalProviderTeam(input.providerMatch.record.awayTeam);
  const warningInput = {
    matchNumber: input.topology.matchNumber,
    stage: input.topology.stage,
    providerFixtureId: input.providerMatch.record.providerFixtureId,
    providerHomeTeam: input.providerMatch.record.homeTeam,
    providerAwayTeam: input.providerMatch.record.awayTeam,
    ...(input.internalHome.team === undefined ? {} : { internalHomeTeam: input.internalHome.team }),
    ...(input.internalAway.team === undefined ? {} : { internalAwayTeam: input.internalAway.team })
  };

  if (
    providerHomeTeam === undefined ||
    providerAwayTeam === undefined ||
    normalizeTeamKey(providerHomeTeam) === normalizeTeamKey(providerAwayTeam)
  ) {
    return {
      warning: providerFixtureParticipantWarning({
        code: "provider_fixture_participants_unresolved",
        ...warningInput
      })
    };
  }

  const conflictsWithInternal =
    input.internalHome.team !== undefined &&
    input.internalAway.team !== undefined &&
    (normalizeTeamKey(providerHomeTeam) !== normalizeTeamKey(input.internalHome.team) ||
      normalizeTeamKey(providerAwayTeam) !== normalizeTeamKey(input.internalAway.team));

  return {
    home: participantFromTeam(providerHomeTeam, officialTeam(providerHomeTeam), "official_participant", []),
    away: participantFromTeam(providerAwayTeam, officialTeam(providerAwayTeam), "official_participant", []),
    ...(conflictsWithInternal
      ? {
          warning: providerFixtureParticipantWarning({
            code: "provider_fixture_participants_override_internal_topology",
            ...warningInput
          })
        }
      : {})
  };
}

function overlapCandidateTeamPair(record: WorldCup2026ExternalFixtureRecord): { home: string; away: string } | null {
  const home = canonicalProviderTeam(record.homeTeam);
  const away = canonicalProviderTeam(record.awayTeam);
  if (home === undefined || away === undefined) return null;
  if (normalizeTeamKey(home) === normalizeTeamKey(away)) return null;
  return { home, away };
}

// Fallback of last resort, applied only after provider fixture id, official
// match number, and exact/reversed team-pair matching all fail to attach a
// record for this topology match. Internal winner_of/loser_of derivation can
// legitimately disagree with the provider's real bracket pairing (e.g. our
// static Round-of-32 fallback data was wrong for an upstream match), so a
// provider record that shares exactly one team with the already-resolved
// participant(s) of this match is treated as the authoritative real fixture
// for this slot, superseding the internally derived opponent. Matching on
// both teams would already have been found above, so only single-team
// overlap reaches this step. Multiple equally-plausible overlapping records
// are rejected as ambiguous rather than guessed.
function findRoundOverlapProviderRecord(
  identity: { officialMatchNumber: number; homeTeam?: string; awayTeam?: string },
  knockoutRecords: readonly WorldCup2026ExternalFixtureRecord[]
): ProviderRecordLookup {
  const anchorKeys = [identity.homeTeam, identity.awayTeam]
    .filter((team): team is string => team !== undefined)
    .map(normalizeTeamKey);
  if (anchorKeys.length === 0) return { match: null };

  const candidates = knockoutRecords.filter((record) => {
    const pair = overlapCandidateTeamPair(record);
    if (pair === null) return false;
    const overlapCount = [normalizeTeamKey(pair.home), normalizeTeamKey(pair.away)].filter((key) =>
      anchorKeys.includes(key)
    ).length;
    return overlapCount === 1;
  });

  if (candidates.length === 0) return { match: null };
  if (candidates.length === 1) {
    return { match: { record: candidates[0]!, orientation: "canonical", method: "round_participant_overlap" } };
  }

  const fingerprints = new Set(candidates.map(providerRecordEssentialFingerprint));
  if (fingerprints.size === 1) {
    return { match: { record: candidates[0]!, orientation: "canonical", method: "round_participant_overlap" } };
  }

  return {
    match: null,
    ambiguity: `Conflicting provider records overlap the resolved participant(s) of official match ${identity.officialMatchNumber} and were rejected as ambiguous.`
  };
}

function findProviderRecord(
  identity: {
    officialMatchNumber: number;
    providerFixtureId?: string;
    homeTeam?: string;
    awayTeam?: string;
    allowRoundOverlapFallback: boolean;
  },
  records: readonly WorldCup2026ExternalFixtureRecord[],
  excludeProviderFixtureIds: ReadonlySet<string> = new Set()
): ProviderRecordLookup {
  const knockoutRecords = records.filter(
    (record) => isKnockoutRecord(record) && !excludeProviderFixtureIds.has(record.providerFixtureId)
  );

  if (identity.providerFixtureId !== undefined) {
    const providerIdMatches = knockoutRecords.filter((record) => record.providerFixtureId === identity.providerFixtureId);
    const selected = selectAuthoritativeRecord(providerIdMatches, identity.officialMatchNumber);
    if (selected.conflict !== undefined) return { match: null, ambiguity: selected.conflict };
    if (selected.record !== undefined) {
      return { match: { record: selected.record, orientation: "canonical", method: "provider_fixture_id" } };
    }
  }

  const matchNumberMatches = knockoutRecords.filter(
    (record) => record.matchday === identity.officialMatchNumber && hasKnockoutStageSignal(record)
  );
  const selectedByNumber = selectAuthoritativeRecord(matchNumberMatches, identity.officialMatchNumber);
  if (selectedByNumber.conflict !== undefined) return { match: null, ambiguity: selectedByNumber.conflict };
  if (selectedByNumber.record !== undefined) {
    return {
      match: { record: selectedByNumber.record, orientation: "canonical", method: "official_match_number" }
    };
  }

  if (identity.homeTeam !== undefined && identity.awayTeam !== undefined) {
    const identityHomeTeam = identity.homeTeam;
    const identityAwayTeam = identity.awayTeam;

    const directTeamMatches = knockoutRecords.filter((record) => {
      return (
        normalizeTeamKey(record.homeTeam) === normalizeTeamKey(identityHomeTeam) &&
        normalizeTeamKey(record.awayTeam) === normalizeTeamKey(identityAwayTeam)
      );
    });
    const selectedDirect = selectAuthoritativeRecord(directTeamMatches, identity.officialMatchNumber);
    if (selectedDirect.conflict !== undefined) return { match: null, ambiguity: selectedDirect.conflict };
    if (selectedDirect.record !== undefined) {
      return { match: { record: selectedDirect.record, orientation: "canonical", method: "teams" } };
    }

    const reversedTeamMatches = knockoutRecords.filter((record) => {
      return (
        normalizeTeamKey(record.homeTeam) === normalizeTeamKey(identityAwayTeam) &&
        normalizeTeamKey(record.awayTeam) === normalizeTeamKey(identityHomeTeam)
      );
    });
    const selectedReversed = selectAuthoritativeRecord(reversedTeamMatches, identity.officialMatchNumber);
    if (selectedReversed.conflict !== undefined) return { match: null, ambiguity: selectedReversed.conflict };
    if (selectedReversed.record !== undefined) {
      return { match: { record: selectedReversed.record, orientation: "canonical", method: "reversed_teams" } };
    }
  }

  if (!identity.allowRoundOverlapFallback) return { match: null };
  return findRoundOverlapProviderRecord(identity, knockoutRecords);
}

function sourcePath(source: KnockoutParticipantSource, records: Map<number, ResolvedMatchRecord>): readonly number[] {
  if (source.kind === "official_team") return [];
  if (source.kind === "unresolved") return [];

  const upstream = records.get(source.matchNumber);
  const participant = source.kind === "winner_of" ? upstream?.winner : upstream?.loser;
  return participant === undefined ? [source.matchNumber] : [...participant.path, source.matchNumber];
}

function resolveParticipant(
  source: KnockoutParticipantSource,
  records: Map<number, ResolvedMatchRecord>
): OfficialKnockoutParticipant {
  if (source.kind === "official_team") {
    return {
      team: source.team,
      source,
      state: "official_participant",
      path: []
    };
  }

  if (source.kind === "unresolved") {
    return {
      source,
      state: "unresolved",
      path: []
    };
  }

  const upstream = records.get(source.matchNumber);
  const participant = source.kind === "winner_of" ? upstream?.winner : upstream?.loser;
  if (participant?.team === undefined) {
    return {
      source,
      state: "unresolved",
      upstreamMatchNumber: source.matchNumber,
      path: sourcePath(source, records)
    };
  }

  const state: KnockoutParticipantState =
    source.kind === "winner_of"
      ? participant.state === "official_winner"
        ? "official_winner"
        : "projected_winner"
      : participant.state === "official_loser"
        ? "official_loser"
        : "projected_loser";

  return {
    team: participant.team,
    source,
    state,
    upstreamMatchNumber: source.matchNumber,
    path: sourcePath(source, records)
  };
}

function participantFromTeam(
  team: string,
  source: KnockoutParticipantSource,
  state: KnockoutParticipantState,
  path: readonly number[]
): OfficialKnockoutParticipant {
  return { team, source, state, path };
}

function providerScore(
  match: ProviderMatchResult
): OfficialKnockoutScore | undefined {
  if (match.record.homeScore === undefined || match.record.awayScore === undefined) return undefined;
  if (match.orientation === "canonical") {
    return {
      homeGoals: match.record.homeScore,
      awayGoals: match.record.awayScore
    };
  }
  return {
    homeGoals: match.record.awayScore,
    awayGoals: match.record.homeScore
  };
}

function providerPenaltyScore(
  match: ProviderMatchResult
): OfficialKnockoutScore | undefined {
  if (match.record.penaltyHomeScore === undefined || match.record.penaltyAwayScore === undefined) return undefined;
  if (match.orientation === "canonical") {
    return {
      homeGoals: match.record.penaltyHomeScore,
      awayGoals: match.record.penaltyAwayScore
    };
  }
  return {
    homeGoals: match.record.penaltyAwayScore,
    awayGoals: match.record.penaltyHomeScore
  };
}

type OfficialWinnerSide = "home" | "away";

function declaredWinnerSide(
  declaredWinner: string | undefined,
  homeTeam: string,
  awayTeam: string
): OfficialWinnerSide | "unmatched" | undefined {
  if (declaredWinner === undefined || declaredWinner.trim() === "") return undefined;
  const winnerKey = normalizeTeamKey(declaredWinner);
  if (winnerKey === normalizeTeamKey(homeTeam)) return "home";
  if (winnerKey === normalizeTeamKey(awayTeam)) return "away";
  return "unmatched";
}

function selectOfficialWinner(
  home: OfficialKnockoutParticipant,
  away: OfficialKnockoutParticipant,
  providerMatch: ProviderMatchResult
): {
  winner?: OfficialKnockoutParticipant;
  loser?: OfficialKnockoutParticipant;
  advancementMethod?: KnockoutAdvancementMethod;
  reason?: string;
  warning?: string;
  penaltyScore?: OfficialKnockoutScore;
} {
  if (home.team === undefined || away.team === undefined) {
    return { warning: "Official completed result could not advance because a participant is unresolved." };
  }

  const score = providerScore(providerMatch);
  if (score === undefined) {
    return { warning: "Official completed result has no usable score and could not advance a winner." };
  }

  const penaltyScore = providerPenaltyScore(providerMatch);
  const decisionMethod = providerMatch.record.decisionMethod;
  const declaredSide = declaredWinnerSide(providerMatch.record.winner, home.team, away.team);
  if (declaredSide === "unmatched") {
    return {
      ...(penaltyScore === undefined ? {} : { penaltyScore }),
      warning: `Official completed result declares winner "${providerMatch.record.winner}" which matches neither participant; the result was rejected as inconsistent.`
    };
  }

  const advance = (side: OfficialWinnerSide, advancementMethod: KnockoutAdvancementMethod, reason: string) => {
    const winnerParticipant = side === "home" ? home : away;
    const loserParticipant = side === "home" ? away : home;
    return {
      winner: participantFromTeam(winnerParticipant.team!, winnerParticipant.source, "official_winner", winnerParticipant.path),
      loser: participantFromTeam(loserParticipant.team!, loserParticipant.source, "official_loser", loserParticipant.path),
      advancementMethod,
      reason,
      ...(penaltyScore === undefined ? {} : { penaltyScore })
    };
  };

  if (score.homeGoals !== score.awayGoals) {
    const scoreSide: OfficialWinnerSide = score.homeGoals > score.awayGoals ? "home" : "away";
    if (declaredSide !== undefined && declaredSide !== scoreSide) {
      return {
        ...(penaltyScore === undefined ? {} : { penaltyScore }),
        warning:
          "Official completed result has a decisive score that conflicts with the provider-declared winner; the result was rejected as inconsistent."
      };
    }
    if (decisionMethod === "penalties") {
      return {
        ...(penaltyScore === undefined ? {} : { penaltyScore }),
        warning:
          "Official completed result reports a penalty decision with a decisive aggregate score; the result was rejected as inconsistent."
      };
    }
    if (decisionMethod === "extra_time") {
      return advance(
        scoreSide,
        "official_extra_time",
        `Official completed result advanced the ${scoreSide} team after extra time.`
      );
    }
    return advance(
      scoreSide,
      "official_regulation",
      `Official completed result advanced the ${scoreSide} team.`
    );
  }

  const penaltySide: OfficialWinnerSide | undefined =
    penaltyScore === undefined || penaltyScore.homeGoals === penaltyScore.awayGoals
      ? undefined
      : penaltyScore.homeGoals > penaltyScore.awayGoals
        ? "home"
        : "away";

  if (declaredSide !== undefined && penaltySide !== undefined && declaredSide !== penaltySide) {
    return {
      ...(penaltyScore === undefined ? {} : { penaltyScore }),
      warning:
        "Official completed result has a penalty score that conflicts with the provider-declared winner; the result was rejected as inconsistent."
    };
  }

  const tiedWinnerSide = declaredSide ?? penaltySide;
  if (tiedWinnerSide === undefined) {
    return {
      ...(penaltyScore === undefined ? {} : { penaltyScore }),
      warning:
        "Official completed knockout result is tied and the provider did not include extra-time or penalty winner metadata."
    };
  }

  if (decisionMethod === "extra_time") {
    return advance(
      tiedWinnerSide,
      "official_extra_time",
      `Official completed result advanced the ${tiedWinnerSide} team after extra time using provider winner metadata.`
    );
  }
  return advance(
    tiedWinnerSide,
    "official_penalties",
    `Official completed result advanced the ${tiedWinnerSide} team on penalties.`
  );
}

function selectProjectedWinner(
  home: OfficialKnockoutParticipant,
  away: OfficialKnockoutParticipant,
  prediction: PredictMatchFromLiveEloSuccessResponse
): {
  winner: OfficialKnockoutParticipant;
  loser: OfficialKnockoutParticipant;
  advancementMethod: KnockoutAdvancementMethod;
  reason: string;
  projectedScore: OfficialKnockoutScore;
  projection: OfficialKnockoutProjectionData;
} {
  const scoreline = prediction.mostLikelyScorelines[0] ?? { homeGoals: 0, awayGoals: 0, probability: 0 };
  const projectedScore = {
    homeGoals: scoreline.homeGoals,
    awayGoals: scoreline.awayGoals
  };

  let homeAdvances: boolean;
  let advancementMethod: KnockoutAdvancementMethod;
  let reason: string;

  if (scoreline.homeGoals > scoreline.awayGoals) {
    homeAdvances = true;
    advancementMethod = "projected_regulation";
    reason = "Modal projected scoreline advances the home team in regulation.";
  } else if (scoreline.awayGoals > scoreline.homeGoals) {
    homeAdvances = false;
    advancementMethod = "projected_regulation";
    reason = "Modal projected scoreline advances the away team in regulation.";
  } else {
    const homeWin = prediction.outcomeProbabilities.homeWinProbability;
    const awayWin = prediction.outcomeProbabilities.awayWinProbability;
    const probabilityDelta = Math.abs(homeWin - awayWin);

    if (probabilityDelta > PROJECTION_TIE_EPSILON) {
      homeAdvances = homeWin > awayWin;
      advancementMethod = "projected_extra_time";
      reason = "Modal scoreline is tied; conditional non-draw probability selects the advancing team.";
    } else {
      const eloDelta = Math.abs(prediction.liveElo.homeEloRating - prediction.liveElo.awayEloRating);
      advancementMethod = "projected_penalties";
      if (eloDelta > PROJECTION_TIE_EPSILON) {
        homeAdvances = prediction.liveElo.homeEloRating > prediction.liveElo.awayEloRating;
        reason = "Modal scoreline and win probabilities are tied; effective Elo selects the advancing team.";
      } else {
        homeAdvances = normalizeTeamKey(home.team ?? "") <= normalizeTeamKey(away.team ?? "");
        reason = "Modal scoreline, win probabilities, and Elo are tied; stable canonical team identity selects the advancing team.";
      }
    }
  }

  const winnerSource = homeAdvances ? home.source : away.source;
  const loserSource = homeAdvances ? away.source : home.source;
  const winnerTeam = homeAdvances ? home.team : away.team;
  const loserTeam = homeAdvances ? away.team : home.team;
  const winnerPath = homeAdvances ? home.path : away.path;
  const loserPath = homeAdvances ? away.path : home.path;

  return {
    winner: participantFromTeam(winnerTeam ?? "Unresolved", winnerSource, "projected_winner", winnerPath),
    loser: participantFromTeam(loserTeam ?? "Unresolved", loserSource, "projected_loser", loserPath),
    advancementMethod,
    reason,
    projectedScore,
    projection: {
      expectedGoals: {
        home: prediction.expectedGoals.home,
        away: prediction.expectedGoals.away
      },
      outcomeProbabilities: prediction.outcomeProbabilities,
      mostLikelyScoreline: {
        homeGoals: scoreline.homeGoals,
        awayGoals: scoreline.awayGoals,
        probability: scoreline.probability
      },
      confidence: prediction.predictionConfidence,
      coverageType: prediction.predictionConfidence.coverageType,
      formulaVersion: prediction.expectedGoals.formulaVersion,
      homeEloRating: prediction.liveElo.homeEloRating,
      awayEloRating: prediction.liveElo.awayEloRating
    }
  };
}

function buildFixtureId(topology: OfficialKnockoutTopologyMatch): string {
  if (topology.stage === "round_of_32") {
    const fixture = WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES.find((f) => f.officialMatchNumber === topology.matchNumber);
    if (fixture !== undefined) return fixture.fixtureId;
  }
  return `wc2026-match-${topology.matchNumber}`;
}

function buildRounds(
  matches: readonly OfficialKnockoutFixtureProjection[]
): Record<OfficialKnockoutStage, readonly OfficialKnockoutFixtureProjection[]> {
  return {
    round_of_32: matches.filter((match) => match.stage === "round_of_32"),
    round_of_16: matches.filter((match) => match.stage === "round_of_16"),
    quarterfinal: matches.filter((match) => match.stage === "quarterfinal"),
    semifinal: matches.filter((match) => match.stage === "semifinal"),
    third_place: matches.filter((match) => match.stage === "third_place"),
    final: matches.filter((match) => match.stage === "final")
  };
}

function podiumEntry(participant: OfficialKnockoutParticipant | undefined): OfficialKnockoutPodiumEntry {
  if (participant?.team === undefined) return { resolution: "unresolved" };
  const official = participant.state === "official_winner" || participant.state === "official_loser";
  return { team: participant.team, resolution: official ? "official" : "projected" };
}

function buildPodium(records: Map<number, ResolvedMatchRecord>): OfficialKnockoutPodium {
  const final = records.get(104);
  const thirdPlace = records.get(103);

  return {
    champion: podiumEntry(final?.winner),
    runnerUp: podiumEntry(final?.loser),
    thirdPlace: podiumEntry(thirdPlace?.winner),
    fourthPlace: podiumEntry(thirdPlace?.loser)
  };
}

function validatePodium(podium: OfficialKnockoutPodium): readonly string[] {
  const concrete = [podium.champion, podium.runnerUp, podium.thirdPlace, podium.fourthPlace]
    .map((entry) => entry.team)
    .filter((team): team is string => team !== undefined);
  return new Set(concrete).size === concrete.length ? [] : ["Podium contains duplicate teams."];
}

function validateEliminationIntegrity(matches: readonly OfficialKnockoutFixtureProjection[]): readonly string[] {
  const warnings: string[] = [];

  for (const match of matches) {
    const loserTeam = match.loser?.team;
    if (loserTeam === undefined) continue;
    const loserKey = normalizeTeamKey(loserTeam);

    for (const later of matches) {
      if (later.officialMatchNumber <= match.officialMatchNumber) continue;
      if (later.officialMatchNumber === 103 && match.stage === "semifinal") continue;

      for (const participant of [later.home, later.away]) {
        if (participant.team !== undefined && normalizeTeamKey(participant.team) === loserKey) {
          if (match.loser?.state === "projected_loser" && !participant.path.includes(match.officialMatchNumber)) {
            continue;
          }
          const laterProviderFixture =
            later.sourceClassification === "provider_official_fixture" ||
            later.sourceClassification === "provider_official_result";
          if (match.loser?.state === "projected_loser" && laterProviderFixture) {
            continue;
          }
          warnings.push(
            `Eliminated team ${loserTeam} (lost match ${match.officialMatchNumber}) appears in match ${later.officialMatchNumber}.`
          );
        }
      }
    }
  }

  return warnings;
}

export function validateOfficialKnockoutTopology(
  topology: readonly OfficialKnockoutTopologyMatch[] = WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY
): readonly string[] {
  const warnings: string[] = [];
  const matchNumbers = topology.map((match) => match.matchNumber);
  const matchSet = new Set(matchNumbers);

  if (topology.length !== 32) warnings.push(`Expected 32 knockout matches, found ${topology.length}.`);
  if (matchSet.size !== matchNumbers.length) warnings.push("Duplicate knockout match numbers detected.");

  for (let matchNumber = 73; matchNumber <= 104; matchNumber += 1) {
    if (!matchSet.has(matchNumber)) warnings.push(`Missing knockout match ${matchNumber}.`);
  }

  for (const match of topology) {
    const expectedStage = stageForMatchNumber(match.matchNumber);
    if (expectedStage !== match.stage) {
      warnings.push(`Match ${match.matchNumber} is in stage ${match.stage}, expected ${expectedStage ?? "none"}.`);
    }

    for (const source of [match.homeSource, match.awaySource]) {
      if ((source.kind === "winner_of" || source.kind === "loser_of") && !matchSet.has(source.matchNumber)) {
        warnings.push(`Match ${match.matchNumber} references missing upstream match ${source.matchNumber}.`);
      }
      if ((source.kind === "winner_of" || source.kind === "loser_of") && source.matchNumber >= match.matchNumber) {
        warnings.push(`Match ${match.matchNumber} has a forward or cyclic upstream reference to ${source.matchNumber}.`);
      }
    }
  }

  const downstreamSlots = new Map<string, number>();
  for (const match of topology) {
    for (const destination of match.downstream) {
      const key = `${destination.matchNumber}:${destination.slot}:${destination.participant}`;
      downstreamSlots.set(key, (downstreamSlots.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of downstreamSlots) {
    if (count !== 1) warnings.push(`Downstream destination ${key} has ${count} sources.`);
  }

  return warnings;
}

export function validateOfficialRoundOf32Fixtures(
  fixtures: readonly OfficialRoundOf32FixtureFoundation[] = WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES
): readonly string[] {
  const warnings: string[] = [];
  if (fixtures.length !== 16) warnings.push(`Expected 16 Round-of-32 fixtures, found ${fixtures.length}.`);

  const matchNumbers = fixtures.map((fixture) => fixture.officialMatchNumber);
  if (new Set(matchNumbers).size !== matchNumbers.length) warnings.push("Duplicate Round-of-32 match numbers detected.");

  const teams = fixtures.flatMap((fixture) => [normalizeTeamKey(fixture.homeTeam), normalizeTeamKey(fixture.awayTeam)]);
  if (new Set(teams).size !== 32) warnings.push("Round-of-32 participants are not unique.");

  for (const fixture of fixtures) {
    if (fixture.officialMatchNumber < 73 || fixture.officialMatchNumber > 88) {
      warnings.push(`Round-of-32 fixture ${fixture.fixtureId} has invalid official match number ${fixture.officialMatchNumber}.`);
    }
  }

  return warnings;
}

function validateRoundParticipantUniqueness(matches: readonly OfficialKnockoutFixtureProjection[]): readonly string[] {
  const warnings: string[] = [];
  for (const stage of ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "third_place", "final"] as const) {
    const teams = matches
      .filter((match) => match.stage === stage)
      .flatMap((match) => [match.home.team, match.away.team])
      .filter((team): team is string => team !== undefined)
      .map(normalizeTeamKey);
    if (new Set(teams).size !== teams.length) {
      warnings.push(`Stage ${stage} contains a duplicate participant.`);
    }
  }
  return warnings;
}

export function buildOfficialWorldCup2026KnockoutProjection(
  input: BuildOfficialWorldCup2026KnockoutProjectionInput = {}
): OfficialKnockoutProjectionResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const predict = input.predictMatch ?? predictMatchFromLiveElo;
  const warnings: string[] = [];
  const matchingIssues: string[] = [];
  let predictorCallCount = 0;

  const providerRecords = uniqueRecords([
    ...(input.syncResult?.completedResults ?? []),
    ...(input.syncResult?.liveMatches ?? []),
    ...(input.syncResult?.fixtures ?? [])
  ]);

  if (input.syncResult?.status === "error") {
    warnings.push("Results provider synchronization failed; canonical official fixture fallback is being used.");
  }

  const topologyWarnings = validateOfficialKnockoutTopology();
  const r32Warnings = validateOfficialRoundOf32Fixtures();
  const records = new Map<number, ResolvedMatchRecord>();
  const matches: OfficialKnockoutFixtureProjection[] = [];
  const consumedProviderFixtureIds = new Set<string>();

  for (const topology of WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY) {
    let home = resolveParticipant(topology.homeSource, records);
    let away = resolveParticipant(topology.awaySource, records);
    const fixtureFoundation: OfficialRoundOf32FixtureFoundation | undefined = WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES.find(
      (fixture) => fixture.officialMatchNumber === topology.matchNumber
    );
    const providerLookup = findProviderRecord(
      {
        officialMatchNumber: topology.matchNumber,
        ...(fixtureFoundation?.providerFixtureId === undefined ? {} : { providerFixtureId: fixtureFoundation.providerFixtureId }),
        ...(home.team === undefined ? {} : { homeTeam: home.team }),
        ...(away.team === undefined ? {} : { awayTeam: away.team }),
        allowRoundOverlapFallback: topology.stage !== "round_of_32"
      },
      providerRecords,
      consumedProviderFixtureIds
    );
    let providerMatch = providerLookup.match;
    if (providerMatch !== null) consumedProviderFixtureIds.add(providerMatch.record.providerFixtureId);
    const matchWarnings: string[] = [];

    let officialScore: OfficialKnockoutScore | undefined;
    let officialPenaltyScore: OfficialKnockoutScore | undefined;
    let projectedScore: OfficialKnockoutScore | undefined;
    let projection: OfficialKnockoutProjectionData | undefined;
    let winner: OfficialKnockoutParticipant | undefined;
    let loser: OfficialKnockoutParticipant | undefined;
    let advancementMethod: KnockoutAdvancementMethod | undefined;
    let advancementReason: string | undefined;
    let sourceState: OfficialKnockoutSourceState =
      topology.stage === "round_of_32" ? "official_fixture" : "projected_participants";
    let status: OfficialKnockoutFixtureProjection["status"] = providerMatch?.record.status ?? "scheduled";
    let sourceClassification: OfficialKnockoutFixtureProjection["sourceClassification"] =
      providerMatch === null ? "canonical_static_official_fixture" : "provider_official_fixture";

    if (providerLookup.ambiguity !== undefined) {
      matchingIssues.push(providerLookup.ambiguity);
      matchWarnings.push(providerLookup.ambiguity);
    }
    if (
      providerMatch === null &&
      providerRecords.length > 0 &&
      providerLookup.ambiguity === undefined
    ) {
      matchingIssues.push(`No unambiguous provider match found for official match ${topology.matchNumber}.`);
    }

    if (providerMatch !== null) {
      const providerParticipants = resolveProviderFixtureParticipants({
        topology,
        providerMatch,
        internalHome: home,
        internalAway: away
      });
      if ("home" in providerParticipants) {
        home = providerParticipants.home;
        away = providerParticipants.away;
        if (providerParticipants.warning !== undefined) {
          warnings.push(providerParticipants.warning);
          matchingIssues.push(providerParticipants.warning);
          matchWarnings.push(providerParticipants.warning);
        }
      } else {
        warnings.push(providerParticipants.warning);
        matchingIssues.push(providerParticipants.warning);
        matchWarnings.push(providerParticipants.warning);
        providerMatch = null;
        status = "scheduled";
        sourceClassification = topology.stage === "round_of_32" ? "canonical_static_official_fixture" : "projected";
      }
    }

    if (providerMatch !== null) {
      officialScore = providerScore(providerMatch);
      officialPenaltyScore = providerPenaltyScore(providerMatch);
      sourceClassification = isCompletedStatus(providerMatch.record.status) ? "provider_official_result" : "provider_official_fixture";
      if (providerMatch.orientation === "reversed") {
        matchWarnings.push(`Provider fixture ${providerMatch.record.providerFixtureId} was reversed and score orientation was corrected.`);
      }
      if (providerMatch.method !== "provider_fixture_id") {
        matchWarnings.push(`Provider fixture matched by ${providerMatch.method}.`);
      }
    }

    if (providerMatch !== null && isCompletedStatus(providerMatch.record.status) && officialScore !== undefined) {
      const officialResolution = selectOfficialWinner(home, away, providerMatch);
      winner = officialResolution.winner;
      loser = officialResolution.loser;
      advancementMethod = officialResolution.advancementMethod;
      advancementReason = officialResolution.reason;
      officialPenaltyScore = officialResolution.penaltyScore ?? officialPenaltyScore;
      sourceState = winner === undefined ? "unresolved" : "official_result";
      if (officialResolution.warning !== undefined) matchWarnings.push(officialResolution.warning);
    } else if (isNonCompletedTerminalStatus(status)) {
      sourceState = "unresolved";
      matchWarnings.push("Fixture has a postponed or cancelled provider status and remains unresolved.");
    } else if (home.team !== undefined && away.team !== undefined) {
      const prediction = predict({
        homeTeam: home.team,
        awayTeam: away.team,
        preset: "balanced",
        mostLikelyScorelineLimit: 3,
        tournamentResultsAdjustment: { enabled: false },
        tournamentFormAdjustment: { enabled: false }
      });
      predictorCallCount += 1;

      if (prediction.status === "success") {
        const projectedResolution = selectProjectedWinner(home, away, prediction);
        winner = projectedResolution.winner;
        loser = projectedResolution.loser;
        advancementMethod = projectedResolution.advancementMethod;
        advancementReason = projectedResolution.reason;
        projectedScore = projectedResolution.projectedScore;
        projection = projectedResolution.projection;
        sourceState =
          home.state === "official_participant" && away.state === "official_participant"
            ? "projected_result"
            : "mixed_official_projected";
        if (providerMatch === null) {
          sourceClassification = topology.stage === "round_of_32" ? "canonical_static_official_fixture" : "projected";
        }
      } else {
        sourceState = "unresolved";
        matchWarnings.push(
          `Prediction unavailable for match ${topology.matchNumber}: ${prediction.issues.map((issue) => issue.message).join("; ")}`
        );
      }
    } else {
      sourceState = "unresolved";
      status = "unavailable";
      matchWarnings.push("Fixture has unresolved participants and was not simulated.");
    }

    const match: OfficialKnockoutFixtureProjection = {
      fixtureId: buildFixtureId(topology),
      officialMatchNumber: topology.matchNumber,
      stage: topology.stage,
      bracketSlot: topology.bracketSlot,
      ...(fixtureFoundation?.kickoffAt === undefined ? {} : { kickoffAt: fixtureFoundation.kickoffAt }),
      home,
      away,
      sourceState,
      status,
      sourceClassification,
      ...(fixtureFoundation?.provenance === undefined ? {} : { provenance: fixtureFoundation.provenance }),
      ...(providerMatch?.record.providerFixtureId === undefined ? {} : { providerFixtureId: providerMatch.record.providerFixtureId }),
      ...(officialScore === undefined ? {} : { officialScore }),
      ...(officialPenaltyScore === undefined ? {} : { officialPenaltyScore }),
      ...(projectedScore === undefined ? {} : { projectedScore }),
      ...(projection === undefined ? {} : { projection }),
      ...(winner === undefined ? {} : { winner }),
      ...(loser === undefined ? {} : { loser }),
      ...(advancementMethod === undefined ? {} : { advancementMethod }),
      ...(advancementReason === undefined ? {} : { advancementReason }),
      upstreamSources: {
        home: topology.homeSource,
        away: topology.awaySource
      },
      downstream: topology.downstream,
      warnings: matchWarnings
    };

    records.set(topology.matchNumber, { match, ...(winner === undefined ? {} : { winner }), ...(loser === undefined ? {} : { loser }) });
    matches.push(match);
  }

  const podium = buildPodium(records);
  const validationWarnings = [
    ...topologyWarnings,
    ...r32Warnings,
    ...validateRoundParticipantUniqueness(matches),
    ...validateEliminationIntegrity(matches),
    ...validatePodium(podium)
  ];

  return {
    status: "success",
    tournamentName: "FIFA World Cup 2026",
    dataScope: "world_cup_2026_official_knockout_projection",
    matches,
    rounds: buildRounds(matches),
    podium,
    warnings,
    validationWarnings,
    matchingIssues,
    metadata: {
      generatedAt,
      ...(input.syncResult?.syncedAt === undefined ? {} : { sourceSynchronizationAt: input.syncResult.syncedAt }),
      canonicalFixtureAsOf: OFFICIAL_ROUND_OF_32_FIXTURE_AS_OF,
      modelVersion: CURRENT_MODEL_VERSION,
      formulaVersion: CURRENT_FORMULA_VERSION,
      providerFallbackUsed: providerRecords.length === 0 || input.syncResult?.localFallbackUsed === true || input.syncResult?.status === "error",
      predictorCallCount,
      metadata: buildApiMetadata([
        "Provider-backed official fixture participants override internal knockout topology when both teams are canonicalizable.",
        "Internal match-number topology for matches 73-104 is used only as a fallback when provider participants are unavailable or unresolved.",
        "Provider identity prefers fixture id when available; otherwise guarded knockout-stage records may use provider matchday and team identity.",
        "Completed official results override model projections.",
        "Unresolved fixtures reuse the production balanced Auto Predict path without writes."
      ])
    }
  };
}
