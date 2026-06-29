import type {
  HistoricalEloReplayComparison,
  HistoricalEloReplayStrategyDiagnostics
} from "./historical-elo-replay.js";

export interface HistoricalEloReplayDiagnosticSummary {
  strategy: string;
  acceptedFixtureCount: number;
  uniquePreMatchEloPairCount: number;
  uniqueBaselineXgPairCount: number;
  uniqueModalScorelineCount: number;
  modalOneOneFrequency: number | null;
  maxEloGap: number | null;
  fixturesAbove167PointGap: number;
}

export function summarizeHistoricalEloReplayDiagnostics(
  comparison: HistoricalEloReplayComparison
): HistoricalEloReplayDiagnosticSummary[] {
  return comparison.strategies.map((strategy) => {
    const diagnostics: HistoricalEloReplayStrategyDiagnostics = strategy.diagnostics;
    return {
      strategy: strategy.strategy,
      acceptedFixtureCount: diagnostics.acceptedFixtureCount,
      uniquePreMatchEloPairCount: diagnostics.uniquePreMatchEloPairCount,
      uniqueBaselineXgPairCount: diagnostics.uniqueBaselineXgPairCount,
      uniqueModalScorelineCount: diagnostics.uniqueModalScorelineCount,
      modalOneOneFrequency: diagnostics.modalOneOneFrequency,
      maxEloGap: diagnostics.maxEloGap,
      fixturesAbove167PointGap: diagnostics.thresholdCounts["167"]?.count ?? 0
    };
  });
}
