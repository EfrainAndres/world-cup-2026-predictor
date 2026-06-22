import { ELO_TO_XG_FORMULA_VERSION } from "../../model/src/index.js";
import { computeContentHash, WORLD_CUP_2026_PREDICTION_MODEL_VERSION } from "./snapshot-service.js";
import type {
  ProjectionFingerprintInput,
  ProjectionRefreshAssessment,
  ProjectionRefreshSourceVersions,
  ProjectionRefreshTriggers
} from "./schemas.js";

export type { ProjectionRefreshAssessment, ProjectionRefreshTriggers, ProjectionRefreshSourceVersions, ProjectionFingerprintInput };

export const PROJECTION_FRESHNESS_UPCOMING_MS = 15 * 60 * 1000;
export const PROJECTION_FRESHNESS_THRESHOLDS = {
  upcoming: PROJECTION_FRESHNESS_UPCOMING_MS,
  live: 0,
  finished: 0,
  localFallback: null
} as const;

const INVALIDATING_STATUSES = new Set(["finished", "live", "halftime", "postponed", "cancelled"]);

export interface AssessProjectionRefreshInput {
  fixtureId: string;
  currentFixtureStatus: string;
  projectionSource: "stored_snapshot" | "auto_predict" | "unavailable";
  projectionGeneratedAt?: string;
  evaluatedAt: string;
  currentFingerprint: string;
  storedFingerprint?: string;
  isImmutableSnapshot: boolean;
  syncMetadata: {
    cacheUsed: boolean;
    localFallbackUsed: boolean;
    lastSuccessfulSync?: string;
    syncedAt: string;
  };
  storedFormulaVersion?: string;
  currentFormulaVersion: string;
  storedModelVersion?: string;
  currentModelVersion: string;
  storedTournamentFormVersion?: string;
  currentTournamentFormVersion?: string;
  storedHomeElo?: number;
  storedAwayElo?: number;
  currentHomeElo?: number;
  currentAwayElo?: number;
  storedTournamentMatchesIncluded?: number;
  currentTournamentMatchesIncluded?: number;
  freshnessThresholdMs?: number;
}

export const CURRENT_FORMULA_VERSION: string = ELO_TO_XG_FORMULA_VERSION;
export const CURRENT_MODEL_VERSION: string = WORLD_CUP_2026_PREDICTION_MODEL_VERSION;

export function buildProjectionFingerprint(input: ProjectionFingerprintInput): string {
  return computeContentHash({
    fixtureId: input.fixtureId,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    preset: input.preset,
    formulaVersion: input.formulaVersion,
    modelVersion: input.modelVersion,
    homeElo: input.homeElo,
    awayElo: input.awayElo,
    tournamentMatchesIncluded: input.tournamentMatchesIncluded,
    ...(input.tournamentFormVersion !== undefined ? { tournamentFormVersion: input.tournamentFormVersion } : {}),
    ...(input.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: input.lastSuccessfulSync } : {}),
    ...(input.projectionCutoffAt !== undefined ? { projectionCutoffAt: input.projectionCutoffAt } : {})
  });
}

function buildSourceVersions(input: AssessProjectionRefreshInput): ProjectionRefreshSourceVersions {
  return {
    ...(input.syncMetadata.lastSuccessfulSync !== undefined ? { lastSuccessfulSync: input.syncMetadata.lastSuccessfulSync } : {}),
    formulaVersion: input.currentFormulaVersion,
    modelVersion: input.currentModelVersion,
    ...(input.currentTournamentFormVersion !== undefined ? { tournamentFormVersion: input.currentTournamentFormVersion } : {})
  };
}

export function assessProjectionRefresh(input: AssessProjectionRefreshInput): ProjectionRefreshAssessment {
  const formulaVersionChanged =
    input.storedFormulaVersion !== undefined && input.storedFormulaVersion !== input.currentFormulaVersion;
  const modelVersionChanged =
    input.storedModelVersion !== undefined && input.storedModelVersion !== input.currentModelVersion;
  const eloInputChanged =
    (input.storedHomeElo !== undefined && input.currentHomeElo !== undefined && input.storedHomeElo !== input.currentHomeElo) ||
    (input.storedAwayElo !== undefined && input.currentAwayElo !== undefined && input.storedAwayElo !== input.currentAwayElo);
  const completedResultAdded =
    input.storedTournamentMatchesIncluded !== undefined &&
    input.currentTournamentMatchesIncluded !== undefined &&
    input.currentTournamentMatchesIncluded > input.storedTournamentMatchesIncluded;
  const liveStatusChanged = input.currentFixtureStatus === "live" || input.currentFixtureStatus === "halftime";
  const fixtureStatusChanged = input.currentFixtureStatus !== "scheduled";
  const tournamentFormChanged =
    input.storedTournamentFormVersion !== undefined &&
    input.currentTournamentFormVersion !== undefined &&
    input.storedTournamentFormVersion !== input.currentTournamentFormVersion;
  const providerDataChanged =
    input.storedFingerprint !== undefined &&
    input.storedFingerprint !== input.currentFingerprint &&
    !formulaVersionChanged &&
    !eloInputChanged &&
    !completedResultAdded;

  const triggers: ProjectionRefreshTriggers = {
    providerDataChanged,
    completedResultAdded,
    liveStatusChanged,
    eloInputChanged,
    tournamentFormChanged,
    formulaVersionChanged,
    fixtureStatusChanged,
    snapshotAvailable: input.isImmutableSnapshot
  };

  const sourceVersions = buildSourceVersions(input);

  const maybeGeneratedAt =
    input.projectionGeneratedAt !== undefined ? { projectionGeneratedAt: input.projectionGeneratedAt } : {};

  if (input.projectionSource === "unavailable") {
    return {
      state: "unavailable",
      shouldRefresh: false,
      ...maybeGeneratedAt,
      evaluatedAt: input.evaluatedAt,
      reasons: ["No projection is available for this fixture."],
      triggers,
      sourceVersions
    };
  }

  if (INVALIDATING_STATUSES.has(input.currentFixtureStatus)) {
    const reasons: string[] = [];
    if (input.currentFixtureStatus === "finished") {
      reasons.push("Fixture has a completed final result. Pre-match projection is invalidated.");
    } else if (input.currentFixtureStatus === "live" || input.currentFixtureStatus === "halftime") {
      reasons.push("Fixture is currently in play. Pre-match projection is invalidated.");
    } else if (input.currentFixtureStatus === "postponed") {
      reasons.push("Fixture has been postponed. Projection is no longer eligible.");
    } else if (input.currentFixtureStatus === "cancelled") {
      reasons.push("Fixture has been cancelled. Projection is no longer eligible.");
    }
    return {
      state: "invalidated",
      shouldRefresh: false,
      ...maybeGeneratedAt,
      evaluatedAt: input.evaluatedAt,
      reasons,
      triggers,
      sourceVersions
    };
  }

  if (input.syncMetadata.localFallbackUsed) {
    return {
      state: "current",
      shouldRefresh: false,
      ...maybeGeneratedAt,
      evaluatedAt: input.evaluatedAt,
      reasons: ["Local static fallback is active. No time-based freshness claim applies."],
      triggers,
      sourceVersions
    };
  }

  const staleReasons: string[] = [];

  if (completedResultAdded) {
    staleReasons.push("Newer completed results may affect Elo and tournament form inputs.");
  }
  if (formulaVersionChanged) {
    staleReasons.push(
      `Formula version changed from '${input.storedFormulaVersion}' to '${input.currentFormulaVersion}'.`
    );
  }
  if (modelVersionChanged) {
    staleReasons.push(
      `Model version changed from '${input.storedModelVersion}' to '${input.currentModelVersion}'.`
    );
  }
  if (tournamentFormChanged) {
    staleReasons.push("Tournament form formula version has changed.");
  }
  if (eloInputChanged) {
    staleReasons.push("Elo inputs have changed since this projection was generated.");
  }
  if (!input.isImmutableSnapshot && input.syncMetadata.cacheUsed) {
    staleReasons.push("Provider data was served from cache and may not reflect the latest state.");
  }
  if (
    input.storedFingerprint !== undefined &&
    input.storedFingerprint !== input.currentFingerprint &&
    staleReasons.length === 0
  ) {
    staleReasons.push("Projection input fingerprint has changed.");
  }

  if (staleReasons.length > 0) {
    return {
      state: "stale",
      shouldRefresh: !input.isImmutableSnapshot,
      ...maybeGeneratedAt,
      evaluatedAt: input.evaluatedAt,
      reasons: staleReasons,
      triggers,
      sourceVersions
    };
  }

  if (input.projectionGeneratedAt !== undefined && !input.isImmutableSnapshot) {
    const threshold = input.freshnessThresholdMs ?? PROJECTION_FRESHNESS_UPCOMING_MS;
    const generatedMs = new Date(input.projectionGeneratedAt).getTime();
    const evaluatedMs = new Date(input.evaluatedAt).getTime();
    if (!Number.isNaN(generatedMs) && !Number.isNaN(evaluatedMs) && evaluatedMs - generatedMs > threshold) {
      return {
        state: "stale",
        shouldRefresh: true,
        projectionGeneratedAt: input.projectionGeneratedAt,
        evaluatedAt: input.evaluatedAt,
        reasons: [
          `Projection age exceeds the ${Math.round(threshold / 60000)}-minute freshness threshold for upcoming fixtures.`
        ],
        triggers,
        sourceVersions
      };
    }
  }

  return {
    state: "current",
    shouldRefresh: false,
    ...maybeGeneratedAt,
    evaluatedAt: input.evaluatedAt,
    reasons: ["Projection inputs are current."],
    triggers,
    sourceVersions
  };
}
