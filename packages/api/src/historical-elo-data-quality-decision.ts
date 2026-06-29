import type {
  HistoricalEloReplayComparison,
  HistoricalEloReplayStrategy,
  HistoricalEloReplayStrategyResult
} from "./historical-elo-replay.js";

export type HistoricalEloDataQualityDecision =
  | "weighted_replay_ready"
  | "expanded_basic_ready"
  | "replay_still_compressed"
  | "historical_data_insufficient"
  | "mapping_quality_blocked"
  | "no_look_ahead_failure";

export interface HistoricalEloDataQualityStrategySummary {
  strategy: HistoricalEloReplayStrategy;
  acceptedFixtureCount: number;
  unresolvedTeamCount: number;
  noLookAheadFailures: number;
  uniquePreMatchEloPairCount: number;
  uniqueBaselineXgPairCount: number;
  uniqueModalScorelineCount: number;
  modalOneOneFrequency: number | null;
  fixturesAbove167PointGap: number;
  ready: boolean;
  reasons: string[];
}

export interface HistoricalEloDataQualityDecisionResult {
  decision: HistoricalEloDataQualityDecision;
  selectedStrategy: HistoricalEloReplayStrategy | null;
  reasons: string[];
  strategies: HistoricalEloDataQualityStrategySummary[];
}

const MIN_ACCEPTED_EVALUATION_FIXTURES = 100;
const MIN_UNIQUE_PRE_MATCH_ELO_PAIRS = 21;
const MIN_UNIQUE_BASELINE_XG_PAIRS = 11;
const MIN_UNIQUE_MODAL_SCORELINES = 2;

function summarizeStrategy(result: HistoricalEloReplayStrategyResult): HistoricalEloDataQualityStrategySummary {
  const diagnostics = result.diagnostics;
  const reasons: string[] = [];
  const fixturesAbove167PointGap = diagnostics.thresholdCounts["167"]?.count ?? 0;

  if (diagnostics.acceptedFixtureCount < MIN_ACCEPTED_EVALUATION_FIXTURES) {
    reasons.push(
      `Accepted evaluation fixture count ${diagnostics.acceptedFixtureCount} is below ${MIN_ACCEPTED_EVALUATION_FIXTURES}.`
    );
  }
  if (diagnostics.noLookAheadFailures > 0) {
    reasons.push(`${diagnostics.noLookAheadFailures} no-look-ahead failures were detected.`);
  }
  if (diagnostics.unresolvedTeamCount > 0) {
    reasons.push(`${diagnostics.unresolvedTeamCount} unresolved team mappings were detected.`);
  }
  if (diagnostics.uniquePreMatchEloPairCount < MIN_UNIQUE_PRE_MATCH_ELO_PAIRS) {
    reasons.push(
      `Unique pre-match Elo pairs ${diagnostics.uniquePreMatchEloPairCount} is below ${MIN_UNIQUE_PRE_MATCH_ELO_PAIRS}.`
    );
  }
  if (diagnostics.uniqueBaselineXgPairCount < MIN_UNIQUE_BASELINE_XG_PAIRS) {
    reasons.push(
      `Unique baseline xG pairs ${diagnostics.uniqueBaselineXgPairCount} is below ${MIN_UNIQUE_BASELINE_XG_PAIRS}.`
    );
  }
  if (diagnostics.uniqueModalScorelineCount < MIN_UNIQUE_MODAL_SCORELINES) {
    reasons.push(
      `Unique modal scorelines ${diagnostics.uniqueModalScorelineCount} is below ${MIN_UNIQUE_MODAL_SCORELINES}.`
    );
  }
  if (diagnostics.modalOneOneFrequency === null || diagnostics.modalOneOneFrequency >= 1) {
    reasons.push("Modal 1-1 frequency is still 100% or unavailable.");
  }
  if (fixturesAbove167PointGap <= 0) {
    reasons.push("No evaluated fixtures exceed the 167-point Elo-gap threshold.");
  }

  return {
    strategy: result.strategy,
    acceptedFixtureCount: diagnostics.acceptedFixtureCount,
    unresolvedTeamCount: diagnostics.unresolvedTeamCount,
    noLookAheadFailures: diagnostics.noLookAheadFailures,
    uniquePreMatchEloPairCount: diagnostics.uniquePreMatchEloPairCount,
    uniqueBaselineXgPairCount: diagnostics.uniqueBaselineXgPairCount,
    uniqueModalScorelineCount: diagnostics.uniqueModalScorelineCount,
    modalOneOneFrequency: diagnostics.modalOneOneFrequency,
    fixturesAbove167PointGap,
    ready: reasons.length === 0,
    reasons
  };
}

export function makeHistoricalEloDataQualityDecision(
  comparison: HistoricalEloReplayComparison
): HistoricalEloDataQualityDecisionResult {
  const strategies = comparison.strategies.map(summarizeStrategy);
  const reasons: string[] = [];

  if (strategies.some((strategy) => strategy.noLookAheadFailures > 0)) {
    return {
      decision: "no_look_ahead_failure",
      selectedStrategy: null,
      reasons: ["At least one replay strategy reported a no-look-ahead failure."],
      strategies
    };
  }

  if (strategies.every((strategy) => strategy.acceptedFixtureCount < MIN_ACCEPTED_EVALUATION_FIXTURES)) {
    return {
      decision: "historical_data_insufficient",
      selectedStrategy: null,
      reasons: [`No replay strategy reached ${MIN_ACCEPTED_EVALUATION_FIXTURES} accepted evaluation fixtures.`],
      strategies
    };
  }

  if (strategies.some((strategy) => strategy.unresolvedTeamCount > 0)) {
    return {
      decision: "mapping_quality_blocked",
      selectedStrategy: null,
      reasons: ["At least one replay strategy reported unresolved canonical team mappings."],
      strategies
    };
  }

  const weighted = strategies.find((strategy) => strategy.strategy === "expanded_international_weighted");
  if (weighted?.ready === true) {
    return {
      decision: "weighted_replay_ready",
      selectedStrategy: "expanded_international_weighted",
      reasons: ["Expanded weighted replay produced sufficient Elo, xG, and modal-score diversity."],
      strategies
    };
  }

  const expandedBasic = strategies.find((strategy) => strategy.strategy === "expanded_international_basic");
  if (expandedBasic?.ready === true) {
    return {
      decision: "expanded_basic_ready",
      selectedStrategy: "expanded_international_basic",
      reasons: ["Expanded basic replay produced sufficient Elo, xG, and modal-score diversity."],
      strategies
    };
  }

  for (const strategy of strategies) {
    if (strategy.strategy === "expanded_international_basic" || strategy.strategy === "expanded_international_weighted") {
      reasons.push(`${strategy.strategy}: ${strategy.reasons.join(" ")}`);
    }
  }

  return {
    decision: "replay_still_compressed",
    selectedStrategy: null,
    reasons: reasons.length > 0
      ? reasons
      : ["Expanded replay strategies did not produce sufficient rating and scoreline diversity."],
    strategies
  };
}
