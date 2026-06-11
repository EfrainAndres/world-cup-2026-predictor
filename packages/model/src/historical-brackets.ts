export const HISTORICAL_BRACKET_RECONSTRUCTION_VERSION = "historical-bracket-reconstruction-v1";

export const HISTORICAL_32_TEAM_WORLD_CUP_FORMAT = "historical_32_team_world_cup";
export const HISTORICAL_BRACKET_GROUP_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export const EXPECTED_HISTORICAL_BRACKET_MATCHES = 64;
export const EXPECTED_HISTORICAL_GROUP_STAGE_MATCHES = 48;
export const EXPECTED_HISTORICAL_KNOCKOUT_AND_PLACEMENT_MATCHES = 16;
export const EXPECTED_HISTORICAL_ROUND_OF_16_MATCHES = 8;
export const EXPECTED_HISTORICAL_QUARTER_FINAL_MATCHES = 4;
export const EXPECTED_HISTORICAL_SEMI_FINAL_MATCHES = 2;
export const EXPECTED_HISTORICAL_THIRD_PLACE_MATCHES = 1;
export const EXPECTED_HISTORICAL_FINAL_MATCHES = 1;

export type HistoricalBracketStage = "group_stage" | "round_of_16" | "quarter_final" | "semi_final" | "third_place" | "final";
export type HistoricalGroupName = (typeof HISTORICAL_BRACKET_GROUP_NAMES)[number];

export interface HistoricalTournamentBracketFixtureInput {
  match_id: string;
  tournament_year: number;
  stage: HistoricalBracketStage;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  winner: string | null;
  decided_by: string;
  penalty_home_score: number | null;
  penalty_away_score: number | null;
}

export interface HistoricalTournamentBracketInput {
  tournamentYear: number;
  fixtures: readonly HistoricalTournamentBracketFixtureInput[];
}

export interface HistoricalGroupStructure {
  groupName: HistoricalGroupName;
  teams: string[];
  fixtures: HistoricalTournamentBracketFixtureInput[];
}

export interface HistoricalGroupTableRow {
  rank: number;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface HistoricalGroupTable {
  groupName: HistoricalGroupName;
  rows: HistoricalGroupTableRow[];
  winner: HistoricalGroupTableRow;
  runnerUp: HistoricalGroupTableRow;
}

export interface HistoricalKnockoutFixture {
  matchId: string;
  stage: Exclude<HistoricalBracketStage, "group_stage">;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  loser: string;
  decidedBy: string;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
}

export interface HistoricalKnockoutRounds {
  roundOf16: HistoricalKnockoutFixture[];
  quarterFinals: HistoricalKnockoutFixture[];
  semiFinals: HistoricalKnockoutFixture[];
  thirdPlace: HistoricalKnockoutFixture | null;
  final: HistoricalKnockoutFixture | null;
}

export type HistoricalBracketValidationCode =
  | "invalid_tournament_year"
  | "invalid_match_count"
  | "invalid_stage_count"
  | "invalid_group_count"
  | "invalid_group_fixture_count"
  | "invalid_group_team_count"
  | "invalid_qualifier_count"
  | "missing_knockout_winner"
  | "invalid_final"
  | "invalid_third_place";

export interface HistoricalBracketValidationIssue {
  code: HistoricalBracketValidationCode;
  message: string;
  matchId?: string;
  stage?: HistoricalBracketStage;
}

export interface HistoricalBracketWarning {
  code: "simplified_group_tiebreakers" | "result_level_reconstruction";
  severity: "info" | "warning";
  message: string;
}

export interface HistoricalBracketValidationResult {
  valid: boolean;
  issues: HistoricalBracketValidationIssue[];
  warnings: HistoricalBracketWarning[];
}

export interface HistoricalBracketMetadata {
  reconstructionVersion: string;
  tournamentYear: number;
  tournamentFormat: typeof HISTORICAL_32_TEAM_WORLD_CUP_FORMAT;
  expectedMatchCount: number;
  actualMatchCount: number;
  groupStageMatchCount: number;
  knockoutAndPlacementMatchCount: number;
  roundOf16MatchCount: number;
  quarterFinalMatchCount: number;
  semiFinalMatchCount: number;
  thirdPlaceMatchCount: number;
  finalMatchCount: number;
  groupCount: number;
  teamsCount: number;
}

export interface ReconstructedHistoricalBracket {
  tournamentYear: number;
  tournamentFormat: typeof HISTORICAL_32_TEAM_WORLD_CUP_FORMAT;
  groups: HistoricalGroupStructure[];
  groupTables: HistoricalGroupTable[];
  qualifiers: {
    groupWinners: string[];
    groupRunnersUp: string[];
  };
  knockoutRounds: HistoricalKnockoutRounds;
  champion: string;
  runnerUp: string;
  thirdPlace: string | null;
  validation: HistoricalBracketValidationResult;
  metadata: HistoricalBracketMetadata;
  warnings: HistoricalBracketWarning[];
}

export interface HistoricalFixturesByStage {
  groupStage: HistoricalTournamentBracketFixtureInput[];
  roundOf16: HistoricalTournamentBracketFixtureInput[];
  quarterFinals: HistoricalTournamentBracketFixtureInput[];
  semiFinals: HistoricalTournamentBracketFixtureInput[];
  thirdPlace: HistoricalTournamentBracketFixtureInput[];
  final: HistoricalTournamentBracketFixtureInput[];
}

function sortFixtures<T extends HistoricalTournamentBracketFixtureInput>(fixtures: readonly T[]): T[] {
  return [...fixtures].sort((a, b) => {
    const byDate = a.match_date.localeCompare(b.match_date);
    if (byDate !== 0) return byDate;

    return a.match_id.localeCompare(b.match_id);
  });
}

function fixtureOrder<T extends HistoricalTournamentBracketFixtureInput>(fixtures: readonly T[]): T[] {
  return [...fixtures].sort((a, b) => a.match_id.localeCompare(b.match_id));
}

function uniqueTeams(fixtures: readonly HistoricalTournamentBracketFixtureInput[]): string[] {
  const teams: string[] = [];
  const seen = new Set<string>();

  for (const fixture of fixtures) {
    for (const team of [fixture.home_team, fixture.away_team]) {
      if (seen.has(team)) continue;
      seen.add(team);
      teams.push(team);
    }
  }

  return teams;
}

function warning(code: HistoricalBracketWarning["code"], message: string): HistoricalBracketWarning {
  return {
    code,
    severity: code === "simplified_group_tiebreakers" ? "warning" : "info",
    message
  };
}

function defaultWarnings(): HistoricalBracketWarning[] {
  return [
    warning(
      "simplified_group_tiebreakers",
      "Group tables are sorted by points, goal difference, goals for, and team name; the full official FIFA tie-breaker chain is not modeled yet."
    ),
    warning("result_level_reconstruction", "Historical brackets are reconstructed from result-level fixtures, not event-level match data.")
  ];
}

function issue(
  code: HistoricalBracketValidationCode,
  message: string,
  fixture?: HistoricalTournamentBracketFixtureInput
): HistoricalBracketValidationIssue {
  const validationIssue: HistoricalBracketValidationIssue = { code, message };

  if (fixture !== undefined) {
    validationIssue.matchId = fixture.match_id;
    validationIssue.stage = fixture.stage;
  }

  return validationIssue;
}

function getStageCountIssues(stageFixtures: HistoricalFixturesByStage): HistoricalBracketValidationIssue[] {
  const checks: [HistoricalBracketStage, number, HistoricalTournamentBracketFixtureInput[]][] = [
    ["group_stage", EXPECTED_HISTORICAL_GROUP_STAGE_MATCHES, stageFixtures.groupStage],
    ["round_of_16", EXPECTED_HISTORICAL_ROUND_OF_16_MATCHES, stageFixtures.roundOf16],
    ["quarter_final", EXPECTED_HISTORICAL_QUARTER_FINAL_MATCHES, stageFixtures.quarterFinals],
    ["semi_final", EXPECTED_HISTORICAL_SEMI_FINAL_MATCHES, stageFixtures.semiFinals],
    ["third_place", EXPECTED_HISTORICAL_THIRD_PLACE_MATCHES, stageFixtures.thirdPlace],
    ["final", EXPECTED_HISTORICAL_FINAL_MATCHES, stageFixtures.final]
  ];

  return checks.flatMap(([stage, expectedCount, fixtures]) => {
    if (fixtures.length === expectedCount) return [];

    return [
      {
        code: "invalid_stage_count" as const,
        stage,
        message: `${stage} must contain ${expectedCount} fixture(s); received ${fixtures.length}.`
      }
    ];
  });
}

function getKnockoutWinnerIssues(stageFixtures: HistoricalFixturesByStage): HistoricalBracketValidationIssue[] {
  return [...stageFixtures.roundOf16, ...stageFixtures.quarterFinals, ...stageFixtures.semiFinals, ...stageFixtures.thirdPlace, ...stageFixtures.final].flatMap(
    (fixture) => {
      if (fixture.winner !== null && fixture.winner.length > 0) return [];

      return [issue("missing_knockout_winner", "Knockout and placement fixtures must include a winner.", fixture)];
    }
  );
}

function validateGroupStructures(groups: readonly HistoricalGroupStructure[]): HistoricalBracketValidationIssue[] {
  const issues: HistoricalBracketValidationIssue[] = [];

  if (groups.length !== HISTORICAL_BRACKET_GROUP_NAMES.length) {
    issues.push(issue("invalid_group_count", `Historical 32-team tournaments must contain ${HISTORICAL_BRACKET_GROUP_NAMES.length} groups.`));
  }

  for (const group of groups) {
    if (group.fixtures.length !== 6) {
      issues.push(issue("invalid_group_fixture_count", `Group ${group.groupName} must contain 6 fixtures.`));
    }

    if (group.teams.length !== 4) {
      issues.push(issue("invalid_group_team_count", `Group ${group.groupName} must contain 4 teams.`));
    }
  }

  return issues;
}

function validateGroupQualifiers(groupTables: readonly HistoricalGroupTable[]): HistoricalBracketValidationIssue[] {
  const groupWinners = groupTables.map((table) => table.winner.team);
  const groupRunnersUp = groupTables.map((table) => table.runnerUp.team);

  if (groupWinners.length !== 8 || groupRunnersUp.length !== 8) {
    return [issue("invalid_qualifier_count", "Historical 32-team group tables must produce 8 winners and 8 runners-up.")];
  }

  return [];
}

function toKnockoutFixture(fixture: HistoricalTournamentBracketFixtureInput): HistoricalKnockoutFixture {
  if (fixture.stage === "group_stage") {
    throw new Error("Group-stage fixtures cannot be converted to knockout fixtures.");
  }

  if (fixture.winner === null || fixture.winner.length === 0) {
    throw new Error(`Knockout fixture ${fixture.match_id} must include a winner.`);
  }

  const loser = fixture.winner === fixture.home_team ? fixture.away_team : fixture.home_team;

  if (loser !== fixture.home_team && loser !== fixture.away_team) {
    throw new Error(`Knockout fixture ${fixture.match_id} winner must match one of the teams.`);
  }

  return {
    matchId: fixture.match_id,
    stage: fixture.stage,
    matchDate: fixture.match_date,
    homeTeam: fixture.home_team,
    awayTeam: fixture.away_team,
    homeScore: fixture.home_score,
    awayScore: fixture.away_score,
    winner: fixture.winner,
    loser,
    decidedBy: fixture.decided_by,
    penaltyHomeScore: fixture.penalty_home_score,
    penaltyAwayScore: fixture.penalty_away_score
  };
}

function buildMetadata(
  tournamentYear: number,
  fixtures: readonly HistoricalTournamentBracketFixtureInput[],
  stageFixtures: HistoricalFixturesByStage,
  groups: readonly HistoricalGroupStructure[]
): HistoricalBracketMetadata {
  return {
    reconstructionVersion: HISTORICAL_BRACKET_RECONSTRUCTION_VERSION,
    tournamentYear,
    tournamentFormat: HISTORICAL_32_TEAM_WORLD_CUP_FORMAT,
    expectedMatchCount: EXPECTED_HISTORICAL_BRACKET_MATCHES,
    actualMatchCount: fixtures.length,
    groupStageMatchCount: stageFixtures.groupStage.length,
    knockoutAndPlacementMatchCount:
      stageFixtures.roundOf16.length +
      stageFixtures.quarterFinals.length +
      stageFixtures.semiFinals.length +
      stageFixtures.thirdPlace.length +
      stageFixtures.final.length,
    roundOf16MatchCount: stageFixtures.roundOf16.length,
    quarterFinalMatchCount: stageFixtures.quarterFinals.length,
    semiFinalMatchCount: stageFixtures.semiFinals.length,
    thirdPlaceMatchCount: stageFixtures.thirdPlace.length,
    finalMatchCount: stageFixtures.final.length,
    groupCount: groups.length,
    teamsCount: new Set(groups.flatMap((group) => group.teams)).size
  };
}

export function groupHistoricalFixturesByYear(
  fixtures: readonly HistoricalTournamentBracketFixtureInput[]
): Record<number, HistoricalTournamentBracketFixtureInput[]> {
  const grouped: Record<number, HistoricalTournamentBracketFixtureInput[]> = {};

  for (const fixture of fixtureOrder(fixtures)) {
    grouped[fixture.tournament_year] = grouped[fixture.tournament_year] ?? [];
    grouped[fixture.tournament_year]!.push({ ...fixture });
  }

  return grouped;
}

export function separateHistoricalFixturesByStage(fixtures: readonly HistoricalTournamentBracketFixtureInput[]): HistoricalFixturesByStage {
  return {
    groupStage: fixtureOrder(fixtures.filter((fixture) => fixture.stage === "group_stage")),
    roundOf16: sortFixtures(fixtures.filter((fixture) => fixture.stage === "round_of_16")),
    quarterFinals: sortFixtures(fixtures.filter((fixture) => fixture.stage === "quarter_final")),
    semiFinals: sortFixtures(fixtures.filter((fixture) => fixture.stage === "semi_final")),
    thirdPlace: sortFixtures(fixtures.filter((fixture) => fixture.stage === "third_place")),
    final: sortFixtures(fixtures.filter((fixture) => fixture.stage === "final"))
  };
}

export function reconstructHistoricalGroupStructures(fixtures: readonly HistoricalTournamentBracketFixtureInput[]): HistoricalGroupStructure[] {
  const groupStageFixtures = fixtureOrder(fixtures.filter((fixture) => fixture.stage === "group_stage"));

  return HISTORICAL_BRACKET_GROUP_NAMES.map((groupName, index) => {
    const groupFixtures = groupStageFixtures.slice(index * 6, index * 6 + 6).map((fixture) => ({ ...fixture }));

    return {
      groupName,
      teams: uniqueTeams(groupFixtures),
      fixtures: groupFixtures
    };
  });
}

export function reconstructHistoricalGroupStandings(group: HistoricalGroupStructure): HistoricalGroupTable {
  const rows = new Map<string, Omit<HistoricalGroupTableRow, "rank" | "goalDifference">>();

  for (const team of group.teams) {
    rows.set(team, {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    });
  }

  for (const fixture of group.fixtures) {
    const home = rows.get(fixture.home_team);
    const away = rows.get(fixture.away_team);

    if (home === undefined || away === undefined) {
      throw new Error(`Group ${group.groupName} fixture ${fixture.match_id} includes a team outside the reconstructed group.`);
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += fixture.home_score;
    home.goalsAgainst += fixture.away_score;
    away.goalsFor += fixture.away_score;
    away.goalsAgainst += fixture.home_score;

    if (fixture.home_score > fixture.away_score) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (fixture.away_score > fixture.home_score) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rankedRows = [...rows.values()]
    .map((row) => ({
      ...row,
      rank: 0,
      goalDifference: row.goalsFor - row.goalsAgainst
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

      return a.team.localeCompare(b.team);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const winner = rankedRows[0];
  const runnerUp = rankedRows[1];

  if (winner === undefined || runnerUp === undefined) {
    throw new Error(`Group ${group.groupName} must produce a winner and runner-up.`);
  }

  return {
    groupName: group.groupName,
    rows: rankedRows,
    winner,
    runnerUp
  };
}

export function reconstructHistoricalKnockoutProgression(stageFixtures: HistoricalFixturesByStage): HistoricalKnockoutRounds {
  const finalFixture = stageFixtures.final[0] === undefined ? null : toKnockoutFixture(stageFixtures.final[0]);
  const thirdPlaceFixture = stageFixtures.thirdPlace[0] === undefined ? null : toKnockoutFixture(stageFixtures.thirdPlace[0]);

  return {
    roundOf16: stageFixtures.roundOf16.map((fixture) => toKnockoutFixture(fixture)),
    quarterFinals: stageFixtures.quarterFinals.map((fixture) => toKnockoutFixture(fixture)),
    semiFinals: stageFixtures.semiFinals.map((fixture) => toKnockoutFixture(fixture)),
    thirdPlace: thirdPlaceFixture,
    final: finalFixture
  };
}

export function validateHistoricalBracketInput(input: HistoricalTournamentBracketInput): HistoricalBracketValidationResult {
  const issues: HistoricalBracketValidationIssue[] = [];
  const fixtures = fixtureOrder(input.fixtures);
  const stageFixtures = separateHistoricalFixturesByStage(fixtures);
  const groups = reconstructHistoricalGroupStructures(fixtures);
  const groupTables = groups.map((group) => reconstructHistoricalGroupStandings(group));

  if (!Number.isInteger(input.tournamentYear)) {
    issues.push(issue("invalid_tournament_year", "tournamentYear must be an integer."));
  }

  if (fixtures.some((fixture) => fixture.tournament_year !== input.tournamentYear)) {
    issues.push(issue("invalid_tournament_year", "All fixtures must match the requested tournamentYear."));
  }

  if (fixtures.length !== EXPECTED_HISTORICAL_BRACKET_MATCHES) {
    issues.push(issue("invalid_match_count", `Historical 32-team World Cup tournaments must contain ${EXPECTED_HISTORICAL_BRACKET_MATCHES} matches.`));
  }

  issues.push(...getStageCountIssues(stageFixtures));
  issues.push(...getKnockoutWinnerIssues(stageFixtures));
  issues.push(...validateGroupStructures(groups));
  issues.push(...validateGroupQualifiers(groupTables));

  const finalFixture = stageFixtures.final[0];
  if (stageFixtures.final.length === 1 && (finalFixture === undefined || finalFixture.winner === null)) {
    issues.push(issue("invalid_final", "Final fixture must include a winner.", finalFixture));
  }

  const thirdPlaceFixture = stageFixtures.thirdPlace[0];
  if (stageFixtures.thirdPlace.length === 1 && (thirdPlaceFixture === undefined || thirdPlaceFixture.winner === null)) {
    issues.push(issue("invalid_third_place", "Third-place fixture must include a winner.", thirdPlaceFixture));
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings: defaultWarnings()
  };
}

export function reconstructHistoricalBracket(input: HistoricalTournamentBracketInput): ReconstructedHistoricalBracket {
  const validation = validateHistoricalBracketInput(input);

  if (!validation.valid) {
    throw new Error(`Historical bracket reconstruction failed: ${validation.issues.map((entry) => entry.message).join(" ")}`);
  }

  const fixtures = fixtureOrder(input.fixtures);
  const stageFixtures = separateHistoricalFixturesByStage(fixtures);
  const groups = reconstructHistoricalGroupStructures(fixtures);
  const groupTables = groups.map((group) => reconstructHistoricalGroupStandings(group));
  const knockoutRounds = reconstructHistoricalKnockoutProgression(stageFixtures);

  if (knockoutRounds.final === null) {
    throw new Error("Historical bracket reconstruction failed: final fixture is required.");
  }

  return {
    tournamentYear: input.tournamentYear,
    tournamentFormat: HISTORICAL_32_TEAM_WORLD_CUP_FORMAT,
    groups,
    groupTables,
    qualifiers: {
      groupWinners: groupTables.map((table) => table.winner.team),
      groupRunnersUp: groupTables.map((table) => table.runnerUp.team)
    },
    knockoutRounds,
    champion: knockoutRounds.final.winner,
    runnerUp: knockoutRounds.final.loser,
    thirdPlace: knockoutRounds.thirdPlace?.winner ?? null,
    validation,
    metadata: buildMetadata(input.tournamentYear, fixtures, stageFixtures, groups),
    warnings: validation.warnings
  };
}
