import type { PredictMatchFromLiveEloSuccessResponse } from "./schemas.js";

export interface PredictionTelemetryAttackDefense {
  mode: "off" | "shadow" | "on";
  applied: boolean;
  stageAuthoritative: boolean;
  finalAuthoritative: boolean;
  baselineXg: { home: number; away: number };
  effectiveXg: { home: number; away: number };
  candidateId?: string;
}

export interface PredictionTelemetryStatsBomb {
  mode?: "off" | "shadow" | "on";
  applied: boolean;
  stageAuthoritative: boolean;
  finalAuthoritative: boolean;
  baselineXg: { home: number; away: number };
  adjustedXg: { home: number; away: number };
  signalVersion?: string;
}

export interface PredictionTelemetryArtifact {
  adFingerprint?: string;
  adFingerprintShort?: string;
  adCandidateId?: string;
  adProfileCount?: number;
  adSourceFixtureCount?: number;
  sbSignalVersion?: string;
  sbProvider?: string;
}

export interface PredictionTelemetryRecommendation {
  recommendedScore: { homeGoals: number; awayGoals: number };
  modalScore: { homeGoals: number; awayGoals: number };
}

export interface PredictionTelemetryPayload {
  timestamp: string;
  matchup: { homeTeam: string; awayTeam: string };
  pipeline: {
    eloBaselineXg: { home: number; away: number };
    attackDefense: PredictionTelemetryAttackDefense | null;
    statsBomb: PredictionTelemetryStatsBomb | null;
    finalXg: { home: number; away: number };
  };
  outcomes: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
  };
  recommendation: PredictionTelemetryRecommendation;
  artifact: PredictionTelemetryArtifact;
}

export function buildPredictionTelemetryPayload(
  result: PredictMatchFromLiveEloSuccessResponse,
  timestamp: string,
  artifactDiagnostics?: {
    adFingerprint?: string;
    adFingerprintShort?: string;
    adCandidateId?: string;
    adProfileCount?: number;
    adSourceFixtureCount?: number;
  }
): PredictionTelemetryPayload {
  const adMeta = result.attackDefenseGoalModel;
  const sbMeta = result.statsBombSignal;

  const sbFinalAuthoritative = sbMeta !== undefined && sbMeta.applied && sbMeta.authoritative === "statsbomb";

  let attackDefenseSection: PredictionTelemetryAttackDefense | null = null;
  if (adMeta !== undefined) {
    const adStageAuthoritative = adMeta.applied;
    const adFinalAuthoritative = adMeta.applied && !sbFinalAuthoritative;
    attackDefenseSection = {
      mode: adMeta.mode,
      applied: adMeta.applied,
      stageAuthoritative: adStageAuthoritative,
      finalAuthoritative: adFinalAuthoritative,
      baselineXg: { home: adMeta.baselineExpectedGoals.home, away: adMeta.baselineExpectedGoals.away },
      effectiveXg: { home: adMeta.effectiveExpectedGoals.home, away: adMeta.effectiveExpectedGoals.away },
      ...(adMeta.candidateId !== undefined ? { candidateId: adMeta.candidateId } : {}),
    };
  }

  let statsBombSection: PredictionTelemetryStatsBomb | null = null;
  if (sbMeta !== undefined) {
    const sbStageAuthoritative = sbMeta.applied;
    statsBombSection = {
      ...(sbMeta.rolloutMode !== undefined ? { mode: sbMeta.rolloutMode } : {}),
      applied: sbMeta.applied,
      stageAuthoritative: sbStageAuthoritative,
      finalAuthoritative: sbFinalAuthoritative,
      baselineXg: { home: sbMeta.baselineExpectedGoals.home, away: sbMeta.baselineExpectedGoals.away },
      adjustedXg: { home: sbMeta.adjustedExpectedGoals.home, away: sbMeta.adjustedExpectedGoals.away },
      signalVersion: sbMeta.signalVersion,
    };
  }

  const eloBaselineXg = {
    home: result.expectedGoals.baseExpectedGoals + result.expectedGoals.goalsAdjustment / 2,
    away: result.expectedGoals.baseExpectedGoals - result.expectedGoals.goalsAdjustment / 2,
  };
  const eloXgFromAd = adMeta?.baselineExpectedGoals;
  const eloXgFromSb = sbMeta?.originalEloExpectedGoals ?? sbMeta?.baselineExpectedGoals;
  const resolvedEloBaselineXg =
    eloXgFromAd !== undefined
      ? { home: eloXgFromAd.home, away: eloXgFromAd.away }
      : eloXgFromSb !== undefined
        ? { home: eloXgFromSb.home, away: eloXgFromSb.away }
        : eloBaselineXg;

  const topScorelne = result.mostLikelyScorelines[0];
  const recommendedScore = result.scorelinePresentation !== undefined
    ? {
        homeGoals: result.scorelinePresentation.recommendedScore.homeGoals,
        awayGoals: result.scorelinePresentation.recommendedScore.awayGoals,
      }
    : topScorelne !== undefined
      ? { homeGoals: topScorelne.homeGoals, awayGoals: topScorelne.awayGoals }
      : { homeGoals: 0, awayGoals: 0 };

  const modalScore = result.scorelinePresentation !== undefined
    ? {
        homeGoals: result.scorelinePresentation.modalExactScore.homeGoals,
        awayGoals: result.scorelinePresentation.modalExactScore.awayGoals,
      }
    : recommendedScore;

  const artifact: PredictionTelemetryArtifact = {
    ...(artifactDiagnostics?.adFingerprint !== undefined ? { adFingerprint: artifactDiagnostics.adFingerprint } : {}),
    ...(artifactDiagnostics?.adFingerprintShort !== undefined
      ? { adFingerprintShort: artifactDiagnostics.adFingerprintShort }
      : {}),
    ...(artifactDiagnostics?.adCandidateId !== undefined
      ? { adCandidateId: artifactDiagnostics.adCandidateId }
      : adMeta?.candidateId !== undefined
        ? { adCandidateId: adMeta.candidateId }
        : {}),
    ...(artifactDiagnostics?.adProfileCount !== undefined
      ? { adProfileCount: artifactDiagnostics.adProfileCount }
      : {}),
    ...(artifactDiagnostics?.adSourceFixtureCount !== undefined
      ? { adSourceFixtureCount: artifactDiagnostics.adSourceFixtureCount }
      : {}),
    ...(sbMeta !== undefined ? { sbSignalVersion: sbMeta.signalVersion, sbProvider: sbMeta.provider } : {}),
  };

  return {
    timestamp,
    matchup: {
      homeTeam: result.liveElo.homeTeam,
      awayTeam: result.liveElo.awayTeam,
    },
    pipeline: {
      eloBaselineXg: resolvedEloBaselineXg,
      attackDefense: attackDefenseSection,
      statsBomb: statsBombSection,
      finalXg: { home: result.expectedGoals.home, away: result.expectedGoals.away },
    },
    outcomes: {
      homeWinProbability: result.outcomeProbabilities.homeWinProbability,
      drawProbability: result.outcomeProbabilities.drawProbability,
      awayWinProbability: result.outcomeProbabilities.awayWinProbability,
    },
    recommendation: { recommendedScore, modalScore },
    artifact,
  };
}
