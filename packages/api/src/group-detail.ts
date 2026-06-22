import { buildApiMetadata } from "./schemas.js";
import {
  assessProjectionRefresh,
  buildProjectionFingerprint,
  CURRENT_FORMULA_VERSION,
  CURRENT_MODEL_VERSION
} from "./projection-refresh-policy.js";
import {
  DEFAULT_DAILY_MATCHES_TIMEZONE,
  buildDailyMatchEntry,
  buildFixtureIndex,
  isValidFinishedScore,
  isValidTimeZone,
  mapDailyState,
  resolveFixture
} from "./daily-matches.js";
import { synchronizeWorldCup2026Results } from "./live-results-sync.js";
import { getWorldCup2026LiveGroupStandings } from "./live-group-standings.js";
import { defaultSnapshotStore, type PredictionSnapshotStore } from "./snapshot-store.js";
import {
  defaultPredictionEvaluationStore,
  type PredictionEvaluationStore
} from "./prediction-evaluation-store.js";
import {
  WORLD_CUP_2026_FIXTURE_GROUPS,
  WORLD_CUP_2026_GROUP_STAGE_FIXTURES,
  buildWorldCup2026BestThirdPlaceRanking,
  buildWorldCup2026GroupStandings
} from "./world-cup-2026-teams.js";
import type {
  ApiValidationIssue,
  WorldCup2026DailyMatchEntry,
  GetWorldCup2026GroupDetailInput,
  WorldCup2026DailyMatchIssue,
  WorldCup2026GroupDetailMatch,
  WorldCup2026GroupDetailResponse,
  WorldCup2026GroupDetailSuccessResponse,
  WorldCup2026GroupStandings,
  WorldCup2026SyncResult,
  WorldCup2026FixtureResult,
  WorldCup2026GroupProjection,
  WorldCup2026GroupProjectionFixture,
  WorldCup2026GroupProjectionStatus,
  PredictMatchFromLiveEloResponse,
  ProjectionFingerprintInput,
  ProjectionInputSummary,
  ProjectionRefreshExecution
} from "./schemas.js";

const VALID_GROUPS = new Set(WORLD_CUP_2026_FIXTURE_GROUPS.map((group) => group.group));
const GROUP_INPUT_REGEX = /^Group\s+/i;

export interface BuildWorldCup2026GroupDetailInput extends GetWorldCup2026GroupDetailInput {
  syncResult: WorldCup2026SyncResult;
  generatedAt?: string;
  predictorFn?: (homeTeam: string, awayTeam: string) => PredictMatchFromLiveEloResponse;
  snapshotStore?: PredictionSnapshotStore;
  evaluationStore?: PredictionEvaluationStore;
  previousProjection?: WorldCup2026GroupProjection;
}

function normalizeGroupInput(group: string): string {
  return group.trim().replace(GROUP_INPUT_REGEX, "").toUpperCase();
}

function validateInput(
  input: GetWorldCup2026GroupDetailInput | undefined
): { issues: ApiValidationIssue[]; group?: string; timezone: string } {
  const issues: ApiValidationIssue[] = [];
  const timezone = input?.timezone ?? DEFAULT_DAILY_MATCHES_TIMEZONE;
  const normalizedGroup = input?.group === undefined ? undefined : normalizeGroupInput(input.group);

  if (normalizedGroup === undefined || normalizedGroup.length === 0 || !VALID_GROUPS.has(normalizedGroup)) {
    issues.push({
      field: "group",
      message: "group must be one of A through L."
    });
  }

  if (!isValidTimeZone(timezone)) {
    issues.push({
      field: "timezone",
      message: "timezone must be a valid IANA timezone."
    });
  }

  return {
    issues,
    timezone,
    ...(normalizedGroup === undefined ? {} : { group: normalizedGroup })
  };
}

function toGroupDetailMatch(entry: WorldCup2026DailyMatchEntry, warnings: readonly string[] = []): WorldCup2026GroupDetailMatch {
  return {
    fixtureId: entry.fixtureId,
    ...(entry.providerFixtureId === undefined ? {} : { providerFixtureId: entry.providerFixtureId }),
    ...(entry.group === undefined ? {} : { group: entry.group }),
    ...(entry.matchday === undefined ? {} : { matchday: entry.matchday }),
    ...(entry.kickoffAt === undefined ? {} : { kickoffAt: entry.kickoffAt }),
    ...(entry.localizedKickoff === undefined ? {} : { localizedKickoff: entry.localizedKickoff }),
    homeTeam: entry.homeTeam,
    awayTeam: entry.awayTeam,
    state: entry.state,
    normalizedStatus: entry.normalizedStatus,
    ...(entry.homeScore === undefined ? {} : { homeScore: entry.homeScore }),
    ...(entry.awayScore === undefined ? {} : { awayScore: entry.awayScore }),
    ...(entry.venue === undefined ? {} : { venue: entry.venue }),
    predictionHistory: entry.predictionHistory,
    warnings
  };
}

function buildProviderMetadata(syncResult: WorldCup2026SyncResult): WorldCup2026GroupDetailSuccessResponse["providerMetadata"] {
  return {
    configuredProvider: syncResult.providerMode,
    activeProvider: syncResult.activeProvider,
    cacheUsed: syncResult.cacheUsed,
    localFallbackUsed: syncResult.localFallbackUsed,
    stale: syncResult.cacheUsed,
    ...(syncResult.lastSuccessfulSync === undefined ? {} : { lastSuccessfulSync: syncResult.lastSuccessfulSync })
  };
}

function compareGroupDetailMatches(a: WorldCup2026GroupDetailMatch, b: WorldCup2026GroupDetailMatch): number {
  const aKickoff = a.kickoffAt ?? "";
  const bKickoff = b.kickoffAt ?? "";
  const kickoffCompare = aKickoff.localeCompare(bKickoff);
  if (kickoffCompare !== 0) return kickoffCompare;
  return a.fixtureId.localeCompare(b.fixtureId);
}

function buildQualificationSummary(
  officialGroup: WorldCup2026GroupStandings,
  allOfficialGroups: readonly WorldCup2026GroupStandings[],
  provisionalAvailable: boolean,
  localFallbackUsed: boolean
): WorldCup2026GroupDetailSuccessResponse["qualification"] {
  const firstPlace = officialGroup.standings[0]?.team;
  const secondPlace = officialGroup.standings[1]?.team;
  const thirdPlace = officialGroup.standings[2]?.team;

  let thirdPlaceCurrentlyQualifying: boolean | undefined;
  if (thirdPlace !== undefined) {
    const fullRanking = buildWorldCup2026BestThirdPlaceRanking(allOfficialGroups);
    const entry = fullRanking.find((candidate) => candidate.group === officialGroup.group && candidate.team === thirdPlace);
    thirdPlaceCurrentlyQualifying = entry !== undefined ? entry.qualificationRank <= 8 : undefined;
  }

  let status: "official" | "provisional" | "foundation_only" = "official";
  if (localFallbackUsed || officialGroup.pendingFixtureCount > 0) {
    status = "foundation_only";
  } else if (provisionalAvailable) {
    status = "provisional";
  }

  return {
    ...(firstPlace === undefined ? {} : { firstPlace }),
    ...(secondPlace === undefined ? {} : { secondPlace }),
    ...(thirdPlace === undefined ? {} : { thirdPlace }),
    ...(thirdPlaceCurrentlyQualifying === undefined ? {} : { thirdPlaceCurrentlyQualifying }),
    status
  };
}

function buildStandingsTeams(officialGroup: WorldCup2026GroupStandings): WorldCup2026GroupDetailSuccessResponse["teams"] {
  return officialGroup.standings.map((entry, index) => ({
    team: entry.team,
    position: index + 1
  }));
}

function selectBestProjectionScoreline(
  scorelines: readonly { homeGoals: number; awayGoals: number; probability: number }[]
): { homeGoals: number; awayGoals: number } | undefined {
  if (scorelines.length === 0) return undefined;
  const sorted = [...scorelines].sort(
    (a, b) =>
      b.probability - a.probability ||
      a.homeGoals - b.homeGoals ||
      a.awayGoals - b.awayGoals
  );
  const best = sorted[0];
  return best === undefined ? undefined : { homeGoals: best.homeGoals, awayGoals: best.awayGoals };
}

function buildGroupProjection(
  group: string,
  syncResult: WorldCup2026SyncResult,
  snapshotStore: PredictionSnapshotStore,
  predictorFn: ((homeTeam: string, awayTeam: string) => PredictMatchFromLiveEloResponse) | undefined,
  generatedAt: string,
  previousProjection: WorldCup2026GroupProjection | undefined
): WorldCup2026GroupProjection {
  const groupFixtures = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.filter((f) => f.group === group);
  const fixtureIdx = buildFixtureIndex();

  // Map each sync record to its internal fixture ID (where resolvable)
  const statusByFixtureId = new Map<string, string>();
  for (const record of syncResult.fixtures) {
    const resolved = resolveFixture(record, fixtureIdx);
    if (resolved !== undefined && resolved.group === group) {
      statusByFixtureId.set(resolved.id, record.status);
    } else if (resolved === undefined) {
      const fallback = groupFixtures.find(
        (f) => f.homeTeam === record.homeTeam && f.awayTeam === record.awayTeam
      );
      if (fallback !== undefined) {
        statusByFixtureId.set(fallback.id, record.status);
      }
    }
  }

  // Count completed results for this group (used for stale/fingerprint detection)
  const currentGroupCompletedCount = syncResult.completedResults.filter((r) => {
    const resolved = resolveFixture(r, fixtureIdx);
    return resolved !== undefined && resolved.group === group;
  }).length;

  // Build completed results for projected standings (using actual scores)
  const completedResults: WorldCup2026FixtureResult[] = [];
  for (const record of syncResult.fixtures) {
    if (record.status !== "finished") continue;
    if (!isValidFinishedScore(record)) continue;
    const resolved = resolveFixture(record, fixtureIdx);
    if (resolved === undefined || resolved.group !== group) continue;
    completedResults.push({
      fixtureId: resolved.id,
      status: "completed",
      homeScore: record.homeScore!,
      awayScore: record.awayScore!,
      resultSource: "external_api"
    });
  }
  const completedFixtureIds = new Set(completedResults.map((r) => r.fixtureId));

  const projectionFixtures: WorldCup2026GroupProjectionFixture[] = [];
  const projectionWarnings: string[] = [];
  let unavailableCount = 0;

  // Build O(1) lookup from previous projection for refresh comparison
  const previousFixtureMap = new Map<string, WorldCup2026GroupProjectionFixture>();
  if (previousProjection !== undefined) {
    for (const pf of previousProjection.fixtures) {
      previousFixtureMap.set(pf.fixtureId, pf);
    }
  }

  const syncMeta = {
    cacheUsed: syncResult.cacheUsed,
    localFallbackUsed: syncResult.localFallbackUsed,
    ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {}),
    syncedAt: syncResult.syncedAt
  };

  for (const fixture of groupFixtures) {
    const status = statusByFixtureId.get(fixture.id);

    // Skip completed and live fixtures (not projected)
    if (status === "finished") continue;
    if (status === "live" || status === "halftime") continue;

    // Exclude postponed/cancelled with warning
    if (status === "postponed" || status === "cancelled") {
      projectionWarnings.push(
        `Fixture ${fixture.id} (${fixture.homeTeam} vs ${fixture.awayTeam}) is ${status} and excluded from projection.`
      );
      continue;
    }

    const fixtureStatus = statusByFixtureId.get(fixture.id) ?? "scheduled";

    // Try stored snapshot first
    const snapshots = snapshotStore
      .getByFixtureId(fixture.id)
      .filter((s) => s.status === "pre_match_locked" || s.status === "foundation_unverified")
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt) || b.snapshotId.localeCompare(a.snapshotId));

    const bestSnapshot = snapshots[0];

    if (bestSnapshot !== undefined) {
      const scoreline = selectBestProjectionScoreline(bestSnapshot.prediction.mostLikelyScorelines);

      const storedFpInput: ProjectionFingerprintInput = {
        fixtureId: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        preset: bestSnapshot.modelConfiguration.eloPreset,
        formulaVersion: bestSnapshot.modelVersion,
        modelVersion: bestSnapshot.modelVersion,
        homeElo: bestSnapshot.inputs.homeElo,
        awayElo: bestSnapshot.inputs.awayElo,
        tournamentMatchesIncluded: bestSnapshot.inputs.tournamentMatchesIncluded,
        ...(bestSnapshot.confidence.dataPoints.tournamentFormFormulaVersion !== undefined
          ? { tournamentFormVersion: bestSnapshot.confidence.dataPoints.tournamentFormFormulaVersion }
          : {}),
        projectionCutoffAt: bestSnapshot.cutoffAt
      };
      const currentFpInput: ProjectionFingerprintInput = {
        fixtureId: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        preset: bestSnapshot.modelConfiguration.eloPreset,
        formulaVersion: CURRENT_FORMULA_VERSION,
        modelVersion: CURRENT_MODEL_VERSION,
        homeElo: bestSnapshot.inputs.homeElo,
        awayElo: bestSnapshot.inputs.awayElo,
        tournamentMatchesIncluded: currentGroupCompletedCount,
        ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {}),
        projectionCutoffAt: bestSnapshot.cutoffAt
      };
      const storedFingerprint = buildProjectionFingerprint(storedFpInput);
      const currentFingerprint = buildProjectionFingerprint(currentFpInput);
      const snapshotTournamentFormVersion = bestSnapshot.confidence.dataPoints.tournamentFormFormulaVersion;
      const refreshAssessment = assessProjectionRefresh({
        fixtureId: fixture.id,
        currentFixtureStatus: fixtureStatus,
        projectionSource: "stored_snapshot",
        projectionGeneratedAt: bestSnapshot.capturedAt,
        evaluatedAt: generatedAt,
        currentFingerprint,
        storedFingerprint,
        isImmutableSnapshot: true,
        syncMetadata: syncMeta,
        storedFormulaVersion: bestSnapshot.modelVersion,
        currentFormulaVersion: CURRENT_FORMULA_VERSION,
        storedModelVersion: bestSnapshot.modelVersion,
        currentModelVersion: CURRENT_MODEL_VERSION,
        ...(snapshotTournamentFormVersion !== undefined ? { storedTournamentFormVersion: snapshotTournamentFormVersion } : {}),
        storedHomeElo: bestSnapshot.inputs.homeElo,
        storedAwayElo: bestSnapshot.inputs.awayElo,
        storedTournamentMatchesIncluded: bestSnapshot.inputs.tournamentMatchesIncluded,
        currentTournamentMatchesIncluded: currentGroupCompletedCount
      });

      projectionFixtures.push({
        fixtureId: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        source: "stored_snapshot",
        ...(scoreline !== undefined ? { projectedScoreline: scoreline } : {}),
        homeWinProbability: bestSnapshot.prediction.homeWinProbability,
        drawProbability: bestSnapshot.prediction.drawProbability,
        awayWinProbability: bestSnapshot.prediction.awayWinProbability,
        confidenceLevel: bestSnapshot.confidence.level,
        coverageType: bestSnapshot.confidence.coverageType,
        warnings: [],
        currentFingerprint,
        storedFingerprint,
        refreshAssessment
      });
      continue;
    }

    // Auto Predict fallback (if predictor is available)
    if (predictorFn !== undefined) {
      const prevFixture = previousFixtureMap.get(fixture.id);
      const prevSummary =
        prevFixture?.source === "auto_predict" ? prevFixture.projectionInputSummary : undefined;
      const prevFingerprint =
        prevFixture?.source === "auto_predict" ? prevFixture.currentFingerprint : undefined;

      // Build pre-check fingerprint using previous Elo values (avoids calling predictor just for staleness check)
      const preCheckHomeElo = prevSummary?.homeElo ?? 1500;
      const preCheckAwayElo = prevSummary?.awayElo ?? 1500;
      const preCheckFpInput: ProjectionFingerprintInput = {
        fixtureId: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        preset: "balanced",
        formulaVersion: CURRENT_FORMULA_VERSION,
        modelVersion: CURRENT_MODEL_VERSION,
        homeElo: preCheckHomeElo,
        awayElo: preCheckAwayElo,
        tournamentMatchesIncluded: currentGroupCompletedCount,
        ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {})
      };
      const preCheckFingerprint = buildProjectionFingerprint(preCheckFpInput);

      const preCheckAssessment = assessProjectionRefresh({
        fixtureId: fixture.id,
        currentFixtureStatus: fixtureStatus,
        projectionSource: "auto_predict",
        ...(prevFixture?.refreshAssessment?.projectionGeneratedAt !== undefined
          ? { projectionGeneratedAt: prevFixture.refreshAssessment.projectionGeneratedAt }
          : {}),
        evaluatedAt: generatedAt,
        currentFingerprint: preCheckFingerprint,
        ...(prevFingerprint !== undefined ? { storedFingerprint: prevFingerprint } : {}),
        isImmutableSnapshot: false,
        syncMetadata: syncMeta,
        ...(prevSummary?.formulaVersion !== undefined ? { storedFormulaVersion: prevSummary.formulaVersion } : {}),
        currentFormulaVersion: CURRENT_FORMULA_VERSION,
        ...(prevSummary?.modelVersion !== undefined ? { storedModelVersion: prevSummary.modelVersion } : {}),
        currentModelVersion: CURRENT_MODEL_VERSION,
        ...(prevSummary?.tournamentMatchesIncluded !== undefined
          ? { storedTournamentMatchesIncluded: prevSummary.tournamentMatchesIncluded }
          : {}),
        currentTournamentMatchesIncluded: currentGroupCompletedCount,
        ...(prevSummary?.homeElo !== undefined ? { storedHomeElo: prevSummary.homeElo } : {}),
        ...(prevSummary?.awayElo !== undefined ? { storedAwayElo: prevSummary.awayElo } : {})
      });

      // Reuse previous projection when it's still current (no predictor call)
      const needsFreshPrediction = prevSummary === undefined || preCheckAssessment.shouldRefresh;

      if (!needsFreshPrediction && prevFixture !== undefined) {
        const refreshExecution: ProjectionRefreshExecution = {
          attempted: false,
          completed: false,
          reasonCodes: [],
          warnings: []
        };
        projectionFixtures.push({
          fixtureId: fixture.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          source: "auto_predict",
          ...(prevFixture.projectedScoreline !== undefined ? { projectedScoreline: prevFixture.projectedScoreline } : {}),
          ...(prevFixture.homeWinProbability !== undefined ? { homeWinProbability: prevFixture.homeWinProbability } : {}),
          ...(prevFixture.drawProbability !== undefined ? { drawProbability: prevFixture.drawProbability } : {}),
          ...(prevFixture.awayWinProbability !== undefined ? { awayWinProbability: prevFixture.awayWinProbability } : {}),
          ...(prevFixture.confidenceLevel !== undefined ? { confidenceLevel: prevFixture.confidenceLevel } : {}),
          ...(prevFixture.coverageType !== undefined ? { coverageType: prevFixture.coverageType } : {}),
          warnings: [...prevFixture.warnings],
          currentFingerprint: preCheckFingerprint,
          ...(prevFingerprint !== undefined ? { storedFingerprint: prevFingerprint } : {}),
          refreshAssessment: preCheckAssessment,
          projectionInputSummary: prevSummary,
          refreshExecution
        });
        continue;
      }

      // Call predictor — first generation or stale refresh (one attempt only)
      const isRefresh = prevSummary !== undefined;
      const predictResult = predictorFn(fixture.homeTeam, fixture.awayTeam);

      if (predictResult.status === "success") {
        const scoreline = selectBestProjectionScoreline(predictResult.mostLikelyScorelines);
        const fixtureWarnings: string[] = [...predictResult.warnings];
        if (
          predictResult.liveElo.homeRatingSource === "fallback_seed" ||
          predictResult.liveElo.awayRatingSource === "fallback_seed"
        ) {
          fixtureWarnings.push(
            `Auto Predict used fallback seed rating for one or more teams (${fixture.homeTeam} vs ${fixture.awayTeam}).`
          );
        }

        const freshSummary: ProjectionInputSummary = {
          ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {}),
          // Use currentGroupCompletedCount (what the predictor was given access to), not the
          // predictor's own tournament-adjustment count (which is 0 when adjustment is disabled).
          // This prevents infinite refresh loops: the next call sees storedCount == currentCount.
          tournamentMatchesIncluded: currentGroupCompletedCount,
          formulaVersion: predictResult.expectedGoals?.formulaVersion ?? CURRENT_FORMULA_VERSION,
          modelVersion: CURRENT_MODEL_VERSION,
          homeElo: predictResult.liveElo?.homeEloRating ?? 1500,
          awayElo: predictResult.liveElo?.awayEloRating ?? 1500
        };

        const fpInput: ProjectionFingerprintInput = {
          fixtureId: fixture.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          preset: predictResult.expectedGoals?.preset ?? "balanced",
          formulaVersion: freshSummary.formulaVersion,
          modelVersion: freshSummary.modelVersion,
          homeElo: freshSummary.homeElo,
          awayElo: freshSummary.awayElo,
          tournamentMatchesIncluded: freshSummary.tournamentMatchesIncluded,
          ...(predictResult.tournamentFormAdjustment !== undefined &&
          predictResult.predictionConfidence.dataPoints.tournamentFormFormulaVersion !== undefined
            ? { tournamentFormVersion: predictResult.predictionConfidence.dataPoints.tournamentFormFormulaVersion }
            : {}),
          ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {})
        };
        const currentFingerprint = buildProjectionFingerprint(fpInput);

        // Post-refresh: compare the freshly generated projection against itself.
        // storedXxx = freshSummary (what was just computed) so all delta checks are zero → "current".
        const refreshAssessment = assessProjectionRefresh({
          fixtureId: fixture.id,
          currentFixtureStatus: fixtureStatus,
          projectionSource: "auto_predict",
          evaluatedAt: generatedAt,
          currentFingerprint,
          // Omit storedFingerprint: the fingerprint just changed (intentional refresh),
          // so providerDataChanged would fire spuriously if we compared old vs new.
          isImmutableSnapshot: false,
          syncMetadata: syncMeta,
          storedFormulaVersion: freshSummary.formulaVersion,
          currentFormulaVersion: CURRENT_FORMULA_VERSION,
          storedModelVersion: freshSummary.modelVersion,
          currentModelVersion: CURRENT_MODEL_VERSION,
          storedTournamentMatchesIncluded: freshSummary.tournamentMatchesIncluded,
          currentTournamentMatchesIncluded: currentGroupCompletedCount,
          storedHomeElo: freshSummary.homeElo,
          currentHomeElo: freshSummary.homeElo,
          storedAwayElo: freshSummary.awayElo,
          currentAwayElo: freshSummary.awayElo
        });

        const reasonCodes: string[] = [];
        if (isRefresh) {
          const t = preCheckAssessment.triggers;
          if (t.completedResultAdded) reasonCodes.push("completed_result_added");
          if (t.formulaVersionChanged) reasonCodes.push("formula_version_changed");
          if (t.eloInputChanged) reasonCodes.push("elo_input_changed");
          if (t.tournamentFormChanged) reasonCodes.push("tournament_form_changed");
          if (t.providerDataChanged) reasonCodes.push("provider_data_changed");
          if (preCheckAssessment.state === "stale" && reasonCodes.length === 0) {
            reasonCodes.push("stale_threshold_exceeded");
          }
        }

        const refreshExecution: ProjectionRefreshExecution = {
          attempted: isRefresh,
          completed: isRefresh,
          ...(isRefresh && prevFingerprint !== undefined ? { previousFingerprint: prevFingerprint } : {}),
          ...(isRefresh ? { refreshedFingerprint: currentFingerprint } : {}),
          reasonCodes,
          warnings: fixtureWarnings
        };

        projectionFixtures.push({
          fixtureId: fixture.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          source: "auto_predict",
          ...(scoreline !== undefined ? { projectedScoreline: scoreline } : {}),
          homeWinProbability: predictResult.outcomeProbabilities.homeWinProbability,
          drawProbability: predictResult.outcomeProbabilities.drawProbability,
          awayWinProbability: predictResult.outcomeProbabilities.awayWinProbability,
          confidenceLevel: predictResult.predictionConfidence.level,
          coverageType: predictResult.predictionConfidence.coverageType,
          warnings: fixtureWarnings,
          currentFingerprint,
          ...(prevFingerprint !== undefined ? { storedFingerprint: prevFingerprint } : {}),
          refreshAssessment,
          projectionInputSummary: freshSummary,
          refreshExecution
        });
        continue;
      }

      // Predictor failed — preserve previous projection if available
      if (prevFixture !== undefined && prevFixture.source === "auto_predict") {
        const failureWarning = `Auto Predict refresh failed for ${fixture.homeTeam} vs ${fixture.awayTeam}. Previous projection preserved.`;
        projectionWarnings.push(failureWarning);
        const refreshExecution: ProjectionRefreshExecution = {
          attempted: true,
          completed: false,
          ...(prevFingerprint !== undefined ? { previousFingerprint: prevFingerprint } : {}),
          reasonCodes: ["prediction_failed"],
          warnings: [failureWarning]
        };
        projectionFixtures.push({
          fixtureId: fixture.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          source: "auto_predict",
          ...(prevFixture.projectedScoreline !== undefined ? { projectedScoreline: prevFixture.projectedScoreline } : {}),
          ...(prevFixture.homeWinProbability !== undefined ? { homeWinProbability: prevFixture.homeWinProbability } : {}),
          ...(prevFixture.drawProbability !== undefined ? { drawProbability: prevFixture.drawProbability } : {}),
          ...(prevFixture.awayWinProbability !== undefined ? { awayWinProbability: prevFixture.awayWinProbability } : {}),
          ...(prevFixture.confidenceLevel !== undefined ? { confidenceLevel: prevFixture.confidenceLevel } : {}),
          ...(prevFixture.coverageType !== undefined ? { coverageType: prevFixture.coverageType } : {}),
          warnings: [...prevFixture.warnings, failureWarning],
          currentFingerprint: preCheckFingerprint,
          ...(prevFingerprint !== undefined ? { storedFingerprint: prevFingerprint } : {}),
          refreshAssessment: preCheckAssessment,
          ...(prevSummary !== undefined ? { projectionInputSummary: prevSummary } : {}),
          refreshExecution
        });
        continue;
      }
    }

    // Projection unavailable for this fixture
    unavailableCount++;
    projectionWarnings.push(
      `Projection unavailable for ${fixture.homeTeam} vs ${fixture.awayTeam}.`
    );
    const unavailableFingerprint = buildProjectionFingerprint({
      fixtureId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      preset: "balanced",
      formulaVersion: CURRENT_FORMULA_VERSION,
      modelVersion: CURRENT_MODEL_VERSION,
      homeElo: 1500,
      awayElo: 1500,
      tournamentMatchesIncluded: currentGroupCompletedCount,
      ...(syncResult.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: syncResult.lastSuccessfulSync } : {})
    });
    const unavailableAssessment = assessProjectionRefresh({
      fixtureId: fixture.id,
      currentFixtureStatus: fixtureStatus,
      projectionSource: "unavailable",
      evaluatedAt: generatedAt,
      currentFingerprint: unavailableFingerprint,
      isImmutableSnapshot: false,
      syncMetadata: syncMeta,
      currentFormulaVersion: CURRENT_FORMULA_VERSION,
      currentModelVersion: CURRENT_MODEL_VERSION
    });
    projectionFixtures.push({
      fixtureId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      source: "unavailable",
      warnings: [`Projection unavailable for ${fixture.homeTeam} vs ${fixture.awayTeam}.`],
      currentFingerprint: unavailableFingerprint,
      refreshAssessment: unavailableAssessment
    });
  }

  // Determine projection status
  const eligibleCount = projectionFixtures.length;
  let projStatus: WorldCup2026GroupProjectionStatus;
  if (eligibleCount === 0) {
    projStatus = "complete";
  } else if (unavailableCount === 0) {
    projStatus = "complete";
  } else if (unavailableCount === eligibleCount) {
    projStatus = "unavailable";
  } else {
    projStatus = "partial";
  }

  const available = projStatus !== "unavailable";

  if (!available) {
    return {
      available: false,
      status: "unavailable",
      fixtures: projectionFixtures,
      warnings: projectionWarnings
    };
  }

  // Build projected standings from completed results + projected scorelines
  const projectedResults: WorldCup2026FixtureResult[] = [...completedResults];
  for (const pf of projectionFixtures) {
    if (pf.projectedScoreline === undefined) continue;
    if (completedFixtureIds.has(pf.fixtureId)) continue;
    projectedResults.push({
      fixtureId: pf.fixtureId,
      status: "completed",
      homeScore: pf.projectedScoreline.homeGoals,
      awayScore: pf.projectedScoreline.awayGoals,
      resultSource: "external_api"
    });
  }

  const allProjectedGroups = buildWorldCup2026GroupStandings({ results: projectedResults });
  const projectedGroup = allProjectedGroups.find((g) => g.group === group);

  if (projectedGroup === undefined) {
    return {
      available: false,
      status: "unavailable",
      fixtures: projectionFixtures,
      warnings: [...projectionWarnings, "Projected standings could not be resolved for this group."]
    };
  }

  const projectedStandings = projectedGroup.standings;

  // Build projected qualification
  const firstPlace = projectedStandings[0]?.team;
  const secondPlace = projectedStandings[1]?.team;
  const thirdPlace = projectedStandings[2]?.team;

  let projectedThirdPlaceQualifying: boolean | undefined;
  if (thirdPlace !== undefined) {
    const ranking = buildWorldCup2026BestThirdPlaceRanking(allProjectedGroups);
    const entry = ranking.find((e) => e.group === group && e.team === thirdPlace);
    projectedThirdPlaceQualifying = entry !== undefined ? entry.qualificationRank <= 8 : undefined;
  }

  return {
    available: true,
    status: projStatus,
    standings: projectedStandings,
    qualification: {
      ...(firstPlace !== undefined ? { projectedFirstPlace: firstPlace } : {}),
      ...(secondPlace !== undefined ? { projectedSecondPlace: secondPlace } : {}),
      ...(thirdPlace !== undefined ? { projectedThirdPlace: thirdPlace } : {}),
      ...(projectedThirdPlaceQualifying !== undefined ? { projectedThirdPlaceQualifying } : {})
    },
    fixtures: projectionFixtures,
    warnings: projectionWarnings
  };
}

export function buildWorldCup2026GroupDetail(
  input: BuildWorldCup2026GroupDetailInput
): WorldCup2026GroupDetailResponse {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const { issues: validationIssues, group, timezone } = validateInput(input);

  if (validationIssues.length > 0 || group === undefined) {
    return {
      status: "validation_error",
      issues: validationIssues,
      metadata: buildApiMetadata(["Group detail request failed validation before synchronized data was composed."])
    };
  }

  const liveStandings = getWorldCup2026LiveGroupStandings({
    completedResults: input.syncResult.completedResults,
    liveMatches: input.syncResult.liveMatches,
    activeProvider: input.syncResult.activeProvider,
    cacheUsed: input.syncResult.cacheUsed,
    localFallbackUsed: input.syncResult.localFallbackUsed,
    externalProviderEnabled: input.syncResult.externalProviderEnabled,
    ...(input.syncResult.lastSuccessfulSync === undefined
      ? {}
      : { lastSuccessfulSync: input.syncResult.lastSuccessfulSync }),
    generatedAt
  });

  const officialGroup = liveStandings.officialGroups.find((entry) => entry.group === group);
  const provisionalGroup = liveStandings.provisionalGroups?.find((entry) => entry.group === group) ?? null;

  if (officialGroup === undefined) {
    return {
      status: "validation_error",
      issues: [{ field: "group", message: `group '${group}' could not be resolved.` }],
      metadata: buildApiMetadata(["Group detail request could not resolve the requested group from current standings data."])
    };
  }

  const fixtureIndex = buildFixtureIndex();
  const snapshotStore = input.snapshotStore ?? defaultSnapshotStore;
  const evaluationStore = input.evaluationStore ?? defaultPredictionEvaluationStore;
  const projection = buildGroupProjection(group, input.syncResult, snapshotStore, input.predictorFn, generatedAt, input.previousProjection);
  const groupTeams = new Set(WORLD_CUP_2026_FIXTURE_GROUPS.find((entry) => entry.group === group)?.teams ?? []);
  const seenKeys = new Set<string>();
  const completed: WorldCup2026GroupDetailMatch[] = [];
  const live: WorldCup2026GroupDetailMatch[] = [];
  const upcoming: WorldCup2026GroupDetailMatch[] = [];
  const postponed: WorldCup2026GroupDetailMatch[] = [];
  const cancelled: WorldCup2026GroupDetailMatch[] = [];
  const unscheduled: WorldCup2026GroupDetailMatch[] = [];
  const warnings: string[] = [...input.syncResult.warnings];
  const typedIssues: WorldCup2026DailyMatchIssue[] = [];

  for (const record of input.syncResult.fixtures) {
    const fixture = resolveFixture(record, fixtureIndex);
    const resolvedGroup = fixture?.group ?? record.group;
    const belongsToGroup = resolvedGroup === group
      || (fixture === undefined && groupTeams.has(record.homeTeam) && groupTeams.has(record.awayTeam));

    if (!belongsToGroup) {
      continue;
    }

    const dedupeKey = fixture?.id ?? record.providerFixtureId;
    if (seenKeys.has(dedupeKey)) {
      typedIssues.push({
        code: "duplicate_fixture",
        ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
        providerFixtureId: record.providerFixtureId,
        message: `Duplicate fixture record '${dedupeKey}' was skipped for group ${group}.`
      });
      warnings.push(`Duplicate fixture record '${dedupeKey}' was skipped for group ${group}.`);
      continue;
    }
    seenKeys.add(dedupeKey);

    if (record.status === "finished" && !isValidFinishedScore(record)) {
      typedIssues.push({
        code: "invalid_finished_score",
        ...(fixture === undefined ? {} : { fixtureId: fixture.id }),
        providerFixtureId: record.providerFixtureId,
        message: `Finished fixture '${record.providerFixtureId}' is missing valid non-negative integer scores.`
      });
      warnings.push(`Finished fixture '${record.providerFixtureId}' is missing valid non-negative integer scores and was skipped.`);
      continue;
    }

    const entry = toGroupDetailMatch(
      buildDailyMatchEntry(record, fixture, timezone, snapshotStore, evaluationStore),
      fixture === undefined
        ? [`Fixture '${record.providerFixtureId}' could not be resolved to an internal group-stage fixture and was included using provider fields.`]
        : []
    );

    if (entry.warnings.length > 0) {
      warnings.push(...entry.warnings);
    }

    switch (mapDailyState(record.status)) {
      case "final":
        completed.push(entry);
        break;
      case "live":
      case "halftime":
        live.push(entry);
        break;
      case "upcoming":
        if (record.kickoffAt === undefined) {
          unscheduled.push(entry);
        } else {
          upcoming.push(entry);
        }
        break;
      case "postponed":
        postponed.push(entry);
        break;
      case "cancelled":
        cancelled.push(entry);
        break;
      case "unknown":
        warnings.push(`Fixture '${entry.fixtureId}' has unknown normalized status '${record.status}' and was excluded from grouped match collections.`);
        break;
    }
  }

  completed.sort(compareGroupDetailMatches);
  live.sort(compareGroupDetailMatches);
  upcoming.sort(compareGroupDetailMatches);
  postponed.sort(compareGroupDetailMatches);
  cancelled.sort(compareGroupDetailMatches);
  unscheduled.sort(compareGroupDetailMatches);

  if (input.syncResult.cacheUsed) {
    warnings.push("Group detail data was served from cache and may be stale.");
  }
  if (input.syncResult.localFallbackUsed) {
    warnings.push("Group detail data is using the local static fallback provider.");
  }

  if (typedIssues.length > 0) {
    warnings.push(`${typedIssues.length} fixture issue${typedIssues.length === 1 ? "" : "s"} were skipped while composing group detail data.`);
  }

  return {
    status: "success",
    group,
    timezone,
    generatedAt,
    teams: buildStandingsTeams(officialGroup),
    standings: {
      official: officialGroup.standings,
      ...(provisionalGroup === null ? {} : { liveProvisional: provisionalGroup.standings }),
      liveAvailable: provisionalGroup !== null
    },
    matches: {
      completed,
      live,
      upcoming,
      postponed,
      cancelled,
      unscheduled
    },
    qualification: buildQualificationSummary(
      officialGroup,
      liveStandings.officialGroups,
      provisionalGroup !== null,
      input.syncResult.localFallbackUsed
    ),
    projection,
    providerMetadata: buildProviderMetadata(input.syncResult),
    warnings,
    metadata: buildApiMetadata([
      "Group detail composes existing live standings, synchronized fixtures, and read-only prediction history summaries for a single World Cup 2026 group.",
      "Official qualification context derives from official standings only; provisional standings are exposed separately when live matches exist.",
      "No predictions, snapshots, or evaluations are created or mutated while building group detail data."
    ])
  };
}

export async function getWorldCup2026GroupDetail(
  input: GetWorldCup2026GroupDetailInput
): Promise<WorldCup2026GroupDetailResponse> {
  const syncResult = await synchronizeWorldCup2026Results({});
  return buildWorldCup2026GroupDetail({
    ...input,
    syncResult
  });
}
