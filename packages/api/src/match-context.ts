import type {
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026MatchContext,
  WorldCup2026MatchContextFallbackState,
  WorldCup2026MatchContextFixtureImportance,
  WorldCup2026MatchContextGroup,
  WorldCup2026MatchContextProviderFreshness,
  WorldCup2026MatchContextQualificationState,
  WorldCup2026MatchContextResult,
  WorldCup2026MatchContextStandingsMode,
  WorldCup2026MatchContextTournamentForm,
  WorldCup2026GroupStandings,
  WorldCup2026TeamStandingContext,
  WorldCup2026TournamentFormResult
} from "./schemas.js";
import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "./world-cup-2026-teams.js";
import { getWorldCup2026LiveGroupStandings } from "./live-group-standings.js";
import type { GetWorldCup2026LiveGroupStandingsInput } from "./live-group-standings.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";

export interface BuildWorldCup2026MatchContextInput {
  fixtureId: string;
  fixtures?: readonly WorldCup2026ExternalFixtureRecord[];
  completedResults?: readonly WorldCup2026ExternalFixtureRecord[];
  liveMatches?: readonly WorldCup2026ExternalFixtureRecord[];
  tournamentFormResult?: WorldCup2026TournamentFormResult;
  cutoffAt?: string;
  activeProvider?: string;
  cacheUsed?: boolean;
  localFallbackUsed?: boolean;
  externalProviderEnabled?: boolean;
  lastSuccessfulSync?: string;
}

const GROUP_STAGE_TOTAL_FIXTURES_PER_GROUP = 6;

function buildEmptyStandingContext(team: string): WorldCup2026TeamStandingContext {
  return {
    team,
    groupPosition: null,
    points: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0
  };
}

function buildTeamStandingContext(
  team: string,
  group: WorldCup2026GroupStandings | undefined
): WorldCup2026TeamStandingContext {
  if (group === undefined) {
    return buildEmptyStandingContext(team);
  }
  const normalizedTeam = normalizeTeamSearchText(team);
  const positionIndex = group.standings.findIndex(
    (e) => normalizeTeamSearchText(e.team) === normalizedTeam
  );
  if (positionIndex < 0) {
    return buildEmptyStandingContext(team);
  }
  const entry = group.standings[positionIndex];
  if (entry === undefined) {
    return buildEmptyStandingContext(team);
  }
  return {
    team,
    groupPosition: entry.played > 0 ? positionIndex + 1 : null,
    points: entry.points,
    played: entry.played,
    wins: entry.wins,
    draws: entry.draws,
    losses: entry.losses,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalDifference
  };
}

function buildQualificationState(
  officialGroup: WorldCup2026GroupStandings | undefined
): WorldCup2026MatchContextQualificationState {
  if (officialGroup === undefined || officialGroup.standings.length === 0) {
    return { status: "foundation_only" };
  }
  if (officialGroup.completedFixtureCount === 0) {
    return { status: "foundation_only" };
  }

  const standings = officialGroup.standings;
  const status =
    officialGroup.completedFixtureCount >= GROUP_STAGE_TOTAL_FIXTURES_PER_GROUP
      ? "official"
      : "provisional";

  const result: WorldCup2026MatchContextQualificationState = { status };
  if (standings[0] !== undefined) result.firstPlace = standings[0].team;
  if (standings[1] !== undefined) result.secondPlace = standings[1].team;
  if (standings[2] !== undefined) result.thirdPlace = standings[2].team;
  return result;
}

function buildFixtureImportance(
  matchday: number,
  groupComplete: boolean,
  home: WorldCup2026TeamStandingContext,
  away: WorldCup2026TeamStandingContext
): WorldCup2026MatchContextFixtureImportance {
  if (groupComplete) {
    return { level: "low", reasons: ["Group stage is complete."] };
  }
  if (matchday === 3) {
    const reasons: string[] = ["Matchday 3 is decisive for group qualification."];
    if (home.played > 0 || away.played > 0) {
      const homeCanStillEarn = home.points < 6;
      const awayCanStillEarn = away.points < 6;
      if (homeCanStillEarn && awayCanStillEarn) {
        reasons.push("Both teams still have qualification at stake.");
      }
    }
    return { level: "high", reasons };
  }
  if (matchday === 2) {
    return { level: "medium", reasons: ["Matchday 2 shapes qualification standings."] };
  }
  return { level: "low", reasons: ["Opening fixture: qualification stakes are minimal at this stage."] };
}

function findProviderFixtureData(
  records: readonly WorldCup2026ExternalFixtureRecord[],
  fixtureId: string,
  homeTeam: string,
  awayTeam: string
): { providerFixtureId?: string; kickoffAt?: string } {
  const normHome = normalizeTeamSearchText(canonicalizeTeamName(homeTeam));
  const normAway = normalizeTeamSearchText(canonicalizeTeamName(awayTeam));
  for (const record of records) {
    const matchById = record.providerFixtureId === fixtureId;
    const recHome = normalizeTeamSearchText(canonicalizeTeamName(record.homeTeam));
    const recAway = normalizeTeamSearchText(canonicalizeTeamName(record.awayTeam));
    const matchByTeams = recHome === normHome && recAway === normAway;
    if (matchById || matchByTeams) {
      const result: { providerFixtureId?: string; kickoffAt?: string } = {
        providerFixtureId: record.providerFixtureId
      };
      if (record.kickoffAt !== undefined) result.kickoffAt = record.kickoffAt;
      return result;
    }
  }
  return {};
}

export function buildWorldCup2026MatchContext(
  input: BuildWorldCup2026MatchContextInput
): WorldCup2026MatchContextResult {
  const fixture = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((f) => f.id === input.fixtureId);
  if (fixture === undefined) {
    return {
      status: "error",
      code: "fixture_not_found",
      message: `Fixture '${input.fixtureId}' was not found in the canonical World Cup 2026 group-stage fixture list.`
    };
  }

  const standingsInput: GetWorldCup2026LiveGroupStandingsInput | undefined =
    input.completedResults !== undefined
      ? {
          completedResults: input.completedResults,
          liveMatches: input.liveMatches ?? [],
          ...(input.cutoffAt !== undefined ? { cutoffAt: input.cutoffAt } : {}),
          activeProvider: input.activeProvider ?? "local_static",
          cacheUsed: input.cacheUsed ?? false,
          localFallbackUsed: input.localFallbackUsed ?? false,
          externalProviderEnabled: input.externalProviderEnabled ?? false,
          ...(input.lastSuccessfulSync !== undefined
            ? { lastSuccessfulSync: input.lastSuccessfulSync }
            : {})
        }
      : undefined;

  const standingsResponse =
    standingsInput !== undefined
      ? getWorldCup2026LiveGroupStandings(standingsInput)
      : getWorldCup2026LiveGroupStandings();

  const fixtureGroup = fixture.group as WorldCup2026MatchContextGroup;

  const officialGroup = standingsResponse.officialGroups.find((g) => g.group === fixtureGroup);
  const provisionalGroup = standingsResponse.provisionalGroups?.find((g) => g.group === fixtureGroup);

  const activeGroup = provisionalGroup ?? officialGroup;
  const standingsMode: WorldCup2026MatchContextStandingsMode =
    provisionalGroup !== undefined ? "live_provisional" : "official";

  const homeContext = buildTeamStandingContext(fixture.homeTeam, activeGroup);
  const awayContext = buildTeamStandingContext(fixture.awayTeam, activeGroup);

  const groupComplete =
    (officialGroup?.completedFixtureCount ?? 0) >= GROUP_STAGE_TOTAL_FIXTURES_PER_GROUP;

  let tournamentForm: WorldCup2026MatchContextTournamentForm | undefined;
  if (input.tournamentFormResult !== undefined) {
    const homeForm = input.tournamentFormResult.summaries.find(
      (s) => normalizeTeamSearchText(s.team) === normalizeTeamSearchText(fixture.homeTeam)
    );
    const awayForm = input.tournamentFormResult.summaries.find(
      (s) => normalizeTeamSearchText(s.team) === normalizeTeamSearchText(fixture.awayTeam)
    );
    if (homeForm !== undefined || awayForm !== undefined) {
      tournamentForm = {
        homeMatchesPlayed: homeForm?.matchesPlayed ?? 0,
        awayMatchesPlayed: awayForm?.matchesPlayed ?? 0,
        homeFormScore: homeForm?.formScore ?? 0,
        awayFormScore: awayForm?.formScore ?? 0,
        formulaVersion: input.tournamentFormResult.metadata.formulaVersion
      };
    }
  }

  const qualificationState = buildQualificationState(officialGroup);
  const fixtureImportance = buildFixtureImportance(fixture.matchday, groupComplete, homeContext, awayContext);

  const syncMeta = standingsResponse.syncMetadata;
  const providerFreshness: WorldCup2026MatchContextProviderFreshness = {
    activeProvider: syncMeta.activeProvider,
    cacheUsed: syncMeta.cacheUsed,
    localFallbackUsed: syncMeta.localFallbackUsed,
    stale: syncMeta.cacheUsed || syncMeta.localFallbackUsed,
    ...(syncMeta.lastSuccessfulSync !== undefined
      ? { lastSuccessfulSync: syncMeta.lastSuccessfulSync }
      : {})
  };

  const fallbackWarnings: string[] = [];
  if (syncMeta.localFallbackUsed) {
    fallbackWarnings.push("Local static fallback is active. External provider data is unavailable.");
  }
  if (syncMeta.cacheUsed) {
    fallbackWarnings.push("Cached provider data is in use. Provider may be temporarily unavailable.");
  }

  const fallbackState: WorldCup2026MatchContextFallbackState = {
    externalProviderEnabled: syncMeta.externalProviderEnabled,
    localFallbackUsed: syncMeta.localFallbackUsed,
    unresolvedFixture: false,
    warnings: fallbackWarnings
  };

  const allRecords = [
    ...(input.fixtures ?? []),
    ...(input.completedResults ?? []),
    ...(input.liveMatches ?? [])
  ];
  const providerData = findProviderFixtureData(
    allRecords,
    fixture.id,
    fixture.homeTeam,
    fixture.awayTeam
  );

  const context: WorldCup2026MatchContext = {
    fixtureId: fixture.id,
    ...(providerData.providerFixtureId !== undefined
      ? { providerFixtureId: providerData.providerFixtureId }
      : {}),
    group: fixtureGroup,
    matchday: fixture.matchday,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    ...(providerData.kickoffAt !== undefined ? { kickoffAt: providerData.kickoffAt } : {}),
    standingsContext: {
      mode: standingsMode,
      home: homeContext,
      away: awayContext,
      groupComplete
    },
    ...(tournamentForm !== undefined ? { tournamentForm } : {}),
    qualificationState,
    fixtureImportance,
    providerFreshness,
    fallbackState
  };

  return { status: "success", context };
}
