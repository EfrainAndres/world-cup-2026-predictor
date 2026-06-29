import type { BacktestResult } from "./statsbomb-backtesting.js";

export interface ScorelineFrequency {
  homeGoals: number;
  awayGoals: number;
  count: number;
  frequency: number;
}

export interface ScorelineDiversityResult {
  fixtureCount: number;
  top10BaselineModalScorelines: ScorelineFrequency[];
  top10EnrichedModalScorelines: ScorelineFrequency[];
  baselineUniqueModalScorelineCount: number;
  enrichedUniqueModalScorelineCount: number;
  baselineTop1Concentration: number;
  enrichedTop1Concentration: number;
  baselineTop2Concentration: number;
  enrichedTop2Concentration: number;
  baselineAvgTopScorelineProb: number;
  enrichedAvgTopScorelineProb: number;
  baselineAvgFirstSecondGap: number;
  enrichedAvgFirstSecondGap: number;
  baseline0_0Frequency: number;
  baseline1_0Frequency: number;
  baseline0_1Frequency: number;
  baseline1_1Frequency: number;
  baseline2_0Frequency: number;
  baseline0_2Frequency: number;
  baseline2_1Frequency: number;
  baseline1_2Frequency: number;
  enriched0_0Frequency: number;
  enriched1_0Frequency: number;
  enriched0_1Frequency: number;
  enriched1_1Frequency: number;
  enriched2_0Frequency: number;
  enriched0_2Frequency: number;
  enriched2_1Frequency: number;
  enriched1_2Frequency: number;
  pctModalScoreChanged: number;
  pctBaseline1_1ChangedAway: number;
  pctNonBaseline1_1ChangedInto1_1: number;
}

function buildScorelineKey(homeGoals: number, awayGoals: number): string {
  return `${homeGoals}-${awayGoals}`;
}

function buildScorelineFrequencies(
  scorelines: Array<{ homeGoals: number; awayGoals: number }>,
  total: number
): Map<string, ScorelineFrequency> {
  const counts = new Map<string, ScorelineFrequency>();
  for (const s of scorelines) {
    const key = buildScorelineKey(s.homeGoals, s.awayGoals);
    const existing = counts.get(key);
    if (existing !== undefined) {
      existing.count++;
      existing.frequency = existing.count / total;
    } else {
      counts.set(key, { homeGoals: s.homeGoals, awayGoals: s.awayGoals, count: 1, frequency: 1 / total });
    }
  }
  return counts;
}

function getTopN(
  freq: Map<string, ScorelineFrequency>,
  n: number
): ScorelineFrequency[] {
  return [...freq.values()]
    .sort((a, b) => b.count - a.count || a.homeGoals - b.homeGoals || a.awayGoals - b.awayGoals)
    .slice(0, n);
}

function getFreq(freq: Map<string, ScorelineFrequency>, h: number, a: number): number {
  return freq.get(buildScorelineKey(h, a))?.frequency ?? 0;
}

function computeConcentration(top: ScorelineFrequency[], n: number, topK: number): number {
  return top.slice(0, topK).reduce((s, f) => s + f.count, 0) / n;
}

export function evaluateScorelineDiversity(results: BacktestResult[]): ScorelineDiversityResult {
  const n = results.length;

  if (n === 0) {
    const empty: ScorelineFrequency[] = [];
    return {
      fixtureCount: 0,
      top10BaselineModalScorelines: empty,
      top10EnrichedModalScorelines: empty,
      baselineUniqueModalScorelineCount: 0,
      enrichedUniqueModalScorelineCount: 0,
      baselineTop1Concentration: 0,
      enrichedTop1Concentration: 0,
      baselineTop2Concentration: 0,
      enrichedTop2Concentration: 0,
      baselineAvgTopScorelineProb: 0,
      enrichedAvgTopScorelineProb: 0,
      baselineAvgFirstSecondGap: 0,
      enrichedAvgFirstSecondGap: 0,
      baseline0_0Frequency: 0,
      baseline1_0Frequency: 0,
      baseline0_1Frequency: 0,
      baseline1_1Frequency: 0,
      baseline2_0Frequency: 0,
      baseline0_2Frequency: 0,
      baseline2_1Frequency: 0,
      baseline1_2Frequency: 0,
      enriched0_0Frequency: 0,
      enriched1_0Frequency: 0,
      enriched0_1Frequency: 0,
      enriched1_1Frequency: 0,
      enriched2_0Frequency: 0,
      enriched0_2Frequency: 0,
      enriched2_1Frequency: 0,
      enriched1_2Frequency: 0,
      pctModalScoreChanged: 0,
      pctBaseline1_1ChangedAway: 0,
      pctNonBaseline1_1ChangedInto1_1: 0,
    };
  }

  const baselineModals = results.map(r => ({ homeGoals: r.baseline.modalHomeGoals, awayGoals: r.baseline.modalAwayGoals }));
  const enrichedModals = results.map(r => ({ homeGoals: r.enriched.modalHomeGoals, awayGoals: r.enriched.modalAwayGoals }));

  const baselineFreq = buildScorelineFrequencies(baselineModals, n);
  const enrichedFreq = buildScorelineFrequencies(enrichedModals, n);

  const topBaseline = getTopN(baselineFreq, 10);
  const topEnriched = getTopN(enrichedFreq, 10);

  let baselineTopProbSum = 0;
  let enrichedTopProbSum = 0;
  let baselineGapSum = 0;
  let enrichedGapSum = 0;

  for (const r of results) {
    baselineTopProbSum += r.baseline.modalScoreProb;
    enrichedTopProbSum += r.enriched.modalScoreProb;

    const b2nd = r.baseline.top5Scorelines[1]?.probability ?? 0;
    const e2nd = r.enriched.top5Scorelines[1]?.probability ?? 0;
    baselineGapSum += r.baseline.modalScoreProb - b2nd;
    enrichedGapSum += r.enriched.modalScoreProb - e2nd;
  }

  // Modal score change tracking
  let modalChanged = 0;
  let baseline1_1Count = 0;
  let baseline1_1Changed = 0;
  let nonBaseline1_1Count = 0;
  let nonBaseline1_1IntoEnriched1_1 = 0;

  for (let i = 0; i < n; i++) {
    const r = results[i]!;
    const bKey = buildScorelineKey(r.baseline.modalHomeGoals, r.baseline.modalAwayGoals);
    const eKey = buildScorelineKey(r.enriched.modalHomeGoals, r.enriched.modalAwayGoals);

    if (bKey !== eKey) modalChanged++;

    if (r.baseline.modalHomeGoals === 1 && r.baseline.modalAwayGoals === 1) {
      baseline1_1Count++;
      if (r.enriched.modalHomeGoals !== 1 || r.enriched.modalAwayGoals !== 1) {
        baseline1_1Changed++;
      }
    } else {
      nonBaseline1_1Count++;
      if (r.enriched.modalHomeGoals === 1 && r.enriched.modalAwayGoals === 1) {
        nonBaseline1_1IntoEnriched1_1++;
      }
    }
  }

  return {
    fixtureCount: n,
    top10BaselineModalScorelines: topBaseline,
    top10EnrichedModalScorelines: topEnriched,
    baselineUniqueModalScorelineCount: baselineFreq.size,
    enrichedUniqueModalScorelineCount: enrichedFreq.size,
    baselineTop1Concentration: topBaseline.length > 0 ? computeConcentration(topBaseline, n, 1) : 0,
    enrichedTop1Concentration: topEnriched.length > 0 ? computeConcentration(topEnriched, n, 1) : 0,
    baselineTop2Concentration: topBaseline.length > 0 ? computeConcentration(topBaseline, n, 2) : 0,
    enrichedTop2Concentration: topEnriched.length > 0 ? computeConcentration(topEnriched, n, 2) : 0,
    baselineAvgTopScorelineProb: baselineTopProbSum / n,
    enrichedAvgTopScorelineProb: enrichedTopProbSum / n,
    baselineAvgFirstSecondGap: baselineGapSum / n,
    enrichedAvgFirstSecondGap: enrichedGapSum / n,
    baseline0_0Frequency: getFreq(baselineFreq, 0, 0),
    baseline1_0Frequency: getFreq(baselineFreq, 1, 0),
    baseline0_1Frequency: getFreq(baselineFreq, 0, 1),
    baseline1_1Frequency: getFreq(baselineFreq, 1, 1),
    baseline2_0Frequency: getFreq(baselineFreq, 2, 0),
    baseline0_2Frequency: getFreq(baselineFreq, 0, 2),
    baseline2_1Frequency: getFreq(baselineFreq, 2, 1),
    baseline1_2Frequency: getFreq(baselineFreq, 1, 2),
    enriched0_0Frequency: getFreq(enrichedFreq, 0, 0),
    enriched1_0Frequency: getFreq(enrichedFreq, 1, 0),
    enriched0_1Frequency: getFreq(enrichedFreq, 0, 1),
    enriched1_1Frequency: getFreq(enrichedFreq, 1, 1),
    enriched2_0Frequency: getFreq(enrichedFreq, 2, 0),
    enriched0_2Frequency: getFreq(enrichedFreq, 0, 2),
    enriched2_1Frequency: getFreq(enrichedFreq, 2, 1),
    enriched1_2Frequency: getFreq(enrichedFreq, 1, 2),
    pctModalScoreChanged: modalChanged / n,
    pctBaseline1_1ChangedAway: baseline1_1Count > 0 ? baseline1_1Changed / baseline1_1Count : 0,
    pctNonBaseline1_1ChangedInto1_1: nonBaseline1_1Count > 0 ? nonBaseline1_1IntoEnriched1_1 / nonBaseline1_1Count : 0,
  };
}
