import { createHash } from "node:crypto";
import { LIVE_ELO_PIPELINE_VERSION } from "../../model/src/index.js";
import type { PredictMatchFromLiveEloSuccessResponse, WorldCup2026Fixture } from "./schemas.js";
import type { WorldCup2026PredictionSnapshot } from "./schemas.js";

export const WORLD_CUP_2026_PREDICTION_MODEL_VERSION = `wc2026-prediction-${LIVE_ELO_PIPELINE_VERSION}`;

export function canonicalizeForHash(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

export function computeContentHash(content: unknown): string {
  return createHash("sha256").update(canonicalizeForHash(content)).digest("hex");
}

export function buildSnapshotIdempotencyKey(fields: {
  fixtureId: string;
  cutoffAt: string;
  modelVersion: string;
  eloPreset: string;
  maxGoals: number;
  tournamentResultsAdjustmentEnabled: boolean;
}): string {
  return computeContentHash(fields);
}

export function buildSnapshotId(idempotencyKey: string): string {
  return `snap-${idempotencyKey.slice(0, 16)}`;
}

export interface BuildSnapshotInput {
  fixture: WorldCup2026Fixture;
  prediction: PredictMatchFromLiveEloSuccessResponse;
  capturedAt: string;
  cutoffAt: string;
  kickoffAt?: string;
  tournamentResultsAdjustmentEnabled: boolean;
}

export function buildWorldCup2026PredictionSnapshot(input: BuildSnapshotInput): {
  snapshot: WorldCup2026PredictionSnapshot;
  idempotencyKey: string;
} {
  const { fixture, prediction, capturedAt, cutoffAt, kickoffAt, tournamentResultsAdjustmentEnabled } = input;

  const eloPreset = prediction.expectedGoals.preset;
  const maxGoals = prediction.request.maxGoals;

  const idempotencyKey = buildSnapshotIdempotencyKey({
    fixtureId: fixture.id,
    cutoffAt,
    modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
    eloPreset,
    maxGoals,
    tournamentResultsAdjustmentEnabled
  });

  const snapshotId = buildSnapshotId(idempotencyKey);

  const status =
    kickoffAt !== undefined && capturedAt < kickoffAt ? "pre_match_locked" : "foundation_unverified";

  const tournamentMatchesIncluded = prediction.tournamentAdjustment?.matchesIncluded ?? 0;

  const modelConfiguration = {
    predictionMode: "live_elo" as const,
    eloPreset,
    maxGoals,
    tournamentResultsAdjustmentEnabled
  };

  const inputs = {
    homeElo: prediction.liveElo.homeEloRating,
    awayElo: prediction.liveElo.awayEloRating,
    homeUsesFallback: prediction.liveElo.homeRatingSource === "fallback_seed",
    awayUsesFallback: prediction.liveElo.awayRatingSource === "fallback_seed",
    tournamentMatchesIncluded
  };

  const predictionContent = {
    homeExpectedGoals: prediction.expectedGoals.home,
    awayExpectedGoals: prediction.expectedGoals.away,
    homeWinProbability: prediction.outcomeProbabilities.homeWinProbability,
    drawProbability: prediction.outcomeProbabilities.drawProbability,
    awayWinProbability: prediction.outcomeProbabilities.awayWinProbability,
    mostLikelyScorelines: prediction.mostLikelyScorelines.map((s) => ({
      homeGoals: s.homeGoals,
      awayGoals: s.awayGoals,
      probability: s.probability
    }))
  };

  const contentHashSource = {
    fixtureId: fixture.id,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    cutoffAt,
    modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
    modelConfiguration,
    inputs,
    prediction: predictionContent
  };

  const contentHash = computeContentHash(contentHashSource);

  const snapshot: WorldCup2026PredictionSnapshot = {
    snapshotId,
    fixtureId: fixture.id,
    status,
    capturedAt,
    cutoffAt,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    modelVersion: WORLD_CUP_2026_PREDICTION_MODEL_VERSION,
    modelConfiguration,
    inputs,
    prediction: predictionContent,
    confidence: prediction.predictionConfidence,
    provenance: {
      dataCoverage: prediction.liveElo.dataCoverage
    },
    contentHash
  };

  if (kickoffAt !== undefined) {
    snapshot.kickoffAt = kickoffAt;
  }

  if (fixture.group !== undefined) {
    snapshot.group = fixture.group;
  }

  if (fixture.matchday !== undefined) {
    snapshot.matchday = fixture.matchday;
  }

  return { snapshot, idempotencyKey };
}
