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

export interface OfficialRoundOf32FixtureFoundation {
  fixtureId: string;
  officialMatchNumber: number;
  bracketSlot: number;
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
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
  providerFixtureId?: string;
  officialScore?: OfficialKnockoutScore;
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

export interface OfficialKnockoutPodium {
  champion: string;
  runnerUp: string;
  thirdPlace: string;
  fourthPlace: string;
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
  method: "provider_fixture_id" | "official_match_number" | "teams" | "reversed_teams";
}

interface ResolvedMatchRecord {
  match: OfficialKnockoutFixtureProjection;
  winner?: OfficialKnockoutParticipant;
  loser?: OfficialKnockoutParticipant;
}

const OFFICIAL_ROUND_OF_32_FIXTURE_AS_OF = "2026-06-28T00:00:00.000Z";
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
    fixtureId: "wc2026-match-73-mexico-vs-portugal",
    officialMatchNumber: 73,
    bracketSlot: 1,
    kickoffAt: "2026-06-28T16:00:00.000Z",
    homeTeam: "Mexico",
    awayTeam: "Portugal"
  },
  {
    fixtureId: "wc2026-match-74-bosnia-herzegovina-vs-norway",
    officialMatchNumber: 74,
    bracketSlot: 2,
    kickoffAt: "2026-06-28T20:00:00.000Z",
    homeTeam: "Bosnia-Herzegovina",
    awayTeam: "Norway"
  },
  {
    fixtureId: "wc2026-match-75-scotland-vs-iran",
    officialMatchNumber: 75,
    bracketSlot: 3,
    kickoffAt: "2026-06-29T16:00:00.000Z",
    homeTeam: "Scotland",
    awayTeam: "Iran"
  },
  {
    fixtureId: "wc2026-match-76-united-states-vs-ghana",
    officialMatchNumber: 76,
    bracketSlot: 4,
    kickoffAt: "2026-06-29T20:00:00.000Z",
    homeTeam: "United States",
    awayTeam: "Ghana"
  },
  {
    fixtureId: "wc2026-match-77-curacao-vs-germany",
    officialMatchNumber: 77,
    bracketSlot: 5,
    kickoffAt: "2026-06-30T16:00:00.000Z",
    homeTeam: "Curacao",
    awayTeam: "Germany"
  },
  {
    fixtureId: "wc2026-match-78-japan-vs-austria",
    officialMatchNumber: 78,
    bracketSlot: 6,
    kickoffAt: "2026-06-30T20:00:00.000Z",
    homeTeam: "Japan",
    awayTeam: "Austria"
  },
  {
    fixtureId: "wc2026-match-79-belgium-vs-qatar",
    officialMatchNumber: 79,
    bracketSlot: 7,
    kickoffAt: "2026-07-01T16:00:00.000Z",
    homeTeam: "Belgium",
    awayTeam: "Qatar"
  },
  {
    fixtureId: "wc2026-match-80-cape-verde-vs-morocco",
    officialMatchNumber: 80,
    bracketSlot: 8,
    kickoffAt: "2026-07-01T20:00:00.000Z",
    homeTeam: "Cape Verde",
    awayTeam: "Morocco"
  },
  {
    fixtureId: "wc2026-match-81-france-vs-ecuador",
    officialMatchNumber: 81,
    bracketSlot: 9,
    kickoffAt: "2026-07-02T16:00:00.000Z",
    homeTeam: "France",
    awayTeam: "Ecuador"
  },
  {
    fixtureId: "wc2026-match-82-algeria-vs-netherlands",
    officialMatchNumber: 82,
    bracketSlot: 10,
    kickoffAt: "2026-07-02T20:00:00.000Z",
    homeTeam: "Algeria",
    awayTeam: "Netherlands"
  },
  {
    fixtureId: "wc2026-match-83-colombia-vs-egypt",
    officialMatchNumber: 83,
    bracketSlot: 11,
    kickoffAt: "2026-07-03T16:00:00.000Z",
    homeTeam: "Colombia",
    awayTeam: "Egypt"
  },
  {
    fixtureId: "wc2026-match-84-croatia-vs-saudi-arabia",
    officialMatchNumber: 84,
    bracketSlot: 12,
    kickoffAt: "2026-07-03T20:00:00.000Z",
    homeTeam: "Croatia",
    awayTeam: "Saudi Arabia"
  },
  {
    fixtureId: "wc2026-match-85-south-korea-vs-iraq",
    officialMatchNumber: 85,
    bracketSlot: 13,
    kickoffAt: "2026-07-04T16:00:00.000Z",
    homeTeam: "South Korea",
    awayTeam: "Iraq"
  },
  {
    fixtureId: "wc2026-match-86-canada-vs-argentina",
    officialMatchNumber: 86,
    bracketSlot: 14,
    kickoffAt: "2026-07-04T20:00:00.000Z",
    homeTeam: "Canada",
    awayTeam: "Argentina"
  },
  {
    fixtureId: "wc2026-match-87-brazil-vs-dr-congo",
    officialMatchNumber: 87,
    bracketSlot: 15,
    kickoffAt: "2026-07-05T16:00:00.000Z",
    homeTeam: "Brazil",
    awayTeam: "DR Congo"
  },
  {
    fixtureId: "wc2026-match-88-australia-vs-england",
    officialMatchNumber: 88,
    bracketSlot: 16,
    kickoffAt: "2026-07-05T20:00:00.000Z",
    homeTeam: "Australia",
    awayTeam: "England"
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

function isKnockoutRecord(record: WorldCup2026ExternalFixtureRecord): boolean {
  if (record.matchday !== undefined && record.matchday >= 73 && record.matchday <= 104) return true;

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

function findProviderRecord(
  identity: {
    officialMatchNumber: number;
    providerFixtureId?: string;
    homeTeam?: string;
    awayTeam?: string;
  },
  records: readonly WorldCup2026ExternalFixtureRecord[]
): ProviderMatchResult | null {
  const knockoutRecords = records.filter(isKnockoutRecord);

  if (identity.providerFixtureId !== undefined) {
    const providerIdMatches = knockoutRecords.filter((record) => record.providerFixtureId === identity.providerFixtureId);
    if (providerIdMatches.length === 1) {
      return { record: providerIdMatches[0]!, orientation: "canonical", method: "provider_fixture_id" };
    }
    if (providerIdMatches.length > 1) return null;
  }

  const matchNumberMatches = knockoutRecords.filter((record) => record.matchday === identity.officialMatchNumber);
  if (matchNumberMatches.length === 1) {
    const record = matchNumberMatches[0]!;
    const orientation =
      identity.homeTeam !== undefined &&
      identity.awayTeam !== undefined &&
      normalizeTeamKey(record.homeTeam) === normalizeTeamKey(identity.awayTeam) &&
      normalizeTeamKey(record.awayTeam) === normalizeTeamKey(identity.homeTeam)
        ? "reversed"
        : "canonical";
    return { record, orientation, method: "official_match_number" };
  }
  if (matchNumberMatches.length > 1) return null;

  if (identity.homeTeam === undefined || identity.awayTeam === undefined) return null;
  const identityHomeTeam = identity.homeTeam;
  const identityAwayTeam = identity.awayTeam;

  const directTeamMatches = knockoutRecords.filter((record) => {
    return (
      normalizeTeamKey(record.homeTeam) === normalizeTeamKey(identityHomeTeam) &&
      normalizeTeamKey(record.awayTeam) === normalizeTeamKey(identityAwayTeam)
    );
  });
  if (directTeamMatches.length === 1) {
    return { record: directTeamMatches[0]!, orientation: "canonical", method: "teams" };
  }
  if (directTeamMatches.length > 1) return null;

  const reversedTeamMatches = knockoutRecords.filter((record) => {
    return (
      normalizeTeamKey(record.homeTeam) === normalizeTeamKey(identityAwayTeam) &&
      normalizeTeamKey(record.awayTeam) === normalizeTeamKey(identityHomeTeam)
    );
  });
  if (reversedTeamMatches.length === 1) {
    return { record: reversedTeamMatches[0]!, orientation: "reversed", method: "reversed_teams" };
  }

  return null;
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

function selectOfficialWinner(
  home: OfficialKnockoutParticipant,
  away: OfficialKnockoutParticipant,
  score: OfficialKnockoutScore
): {
  winner?: OfficialKnockoutParticipant;
  loser?: OfficialKnockoutParticipant;
  advancementMethod?: KnockoutAdvancementMethod;
  reason?: string;
  warning?: string;
} {
  if (home.team === undefined || away.team === undefined) {
    return { warning: "Official completed result could not advance because a participant is unresolved." };
  }

  if (score.homeGoals > score.awayGoals) {
    return {
      winner: participantFromTeam(home.team, home.source, "official_winner", home.path),
      loser: participantFromTeam(away.team, away.source, "official_loser", away.path),
      advancementMethod: "official_regulation",
      reason: "Official completed result advanced the home team."
    };
  }

  if (score.awayGoals > score.homeGoals) {
    return {
      winner: participantFromTeam(away.team, away.source, "official_winner", away.path),
      loser: participantFromTeam(home.team, home.source, "official_loser", home.path),
      advancementMethod: "official_regulation",
      reason: "Official completed result advanced the away team."
    };
  }

  return {
    warning:
      "Official completed knockout result is tied and the provider did not include extra-time or penalty winner metadata."
  };
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

function buildPodium(records: Map<number, ResolvedMatchRecord>): OfficialKnockoutPodium {
  const final = records.get(104);
  const thirdPlace = records.get(103);
  const podium = {
    champion: final?.winner?.team ?? "Unavailable",
    runnerUp: final?.loser?.team ?? "Unavailable",
    thirdPlace: thirdPlace?.winner?.team ?? "Unavailable",
    fourthPlace: thirdPlace?.loser?.team ?? "Unavailable"
  };

  return podium;
}

function validatePodium(podium: OfficialKnockoutPodium): readonly string[] {
  const values = [podium.champion, podium.runnerUp, podium.thirdPlace, podium.fourthPlace];
  const concrete = values.filter((value) => value !== "Unavailable");
  return new Set(concrete).size === concrete.length ? [] : ["Podium contains duplicate teams."];
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

  for (const topology of WORLD_CUP_2026_OFFICIAL_KNOCKOUT_TOPOLOGY) {
    const home = resolveParticipant(topology.homeSource, records);
    const away = resolveParticipant(topology.awaySource, records);
    const fixtureFoundation: OfficialRoundOf32FixtureFoundation | undefined = WORLD_CUP_2026_OFFICIAL_ROUND_OF_32_FIXTURES.find(
      (fixture) => fixture.officialMatchNumber === topology.matchNumber
    );
    const providerMatch = findProviderRecord(
      {
        officialMatchNumber: topology.matchNumber,
        ...(fixtureFoundation?.providerFixtureId === undefined ? {} : { providerFixtureId: fixtureFoundation.providerFixtureId }),
        ...(home.team === undefined ? {} : { homeTeam: home.team }),
        ...(away.team === undefined ? {} : { awayTeam: away.team })
      },
      providerRecords
    );
    const matchWarnings: string[] = [];

    let officialScore: OfficialKnockoutScore | undefined;
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

    if (providerMatch === null && providerRecords.length > 0) {
      matchingIssues.push(`No unambiguous provider match found for official match ${topology.matchNumber}.`);
    }

    if (providerMatch !== null) {
      officialScore = providerScore(providerMatch);
      sourceClassification = isCompletedStatus(providerMatch.record.status) ? "provider_official_result" : "provider_official_fixture";
      if (providerMatch.orientation === "reversed") {
        matchWarnings.push(`Provider fixture ${providerMatch.record.providerFixtureId} was reversed and score orientation was corrected.`);
      }
      if (providerMatch.method !== "provider_fixture_id") {
        matchWarnings.push(`Provider fixture matched by ${providerMatch.method}.`);
      }
    }

    if (providerMatch !== null && isCompletedStatus(providerMatch.record.status) && officialScore !== undefined) {
      const officialResolution = selectOfficialWinner(home, away, officialScore);
      winner = officialResolution.winner;
      loser = officialResolution.loser;
      advancementMethod = officialResolution.advancementMethod;
      advancementReason = officialResolution.reason;
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
          topology.stage === "round_of_32" && home.state === "official_participant" && away.state === "official_participant"
            ? "projected_result"
            : "mixed_official_projected";
        sourceClassification = providerMatch === null && topology.stage === "round_of_32" ? "canonical_static_official_fixture" : "projected";
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
      ...(providerMatch?.record.providerFixtureId === undefined ? {} : { providerFixtureId: providerMatch.record.providerFixtureId }),
      ...(officialScore === undefined ? {} : { officialScore }),
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
        "Official knockout projection uses canonical match-number topology for matches 73-104.",
        "Completed official results override model projections.",
        "Unresolved fixtures reuse the production balanced Auto Predict path without writes."
      ])
    }
  };
}
