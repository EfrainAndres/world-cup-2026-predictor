import {
  getModelInfo,
  getWorldCup2026FixtureFoundation,
  getWorldCup2026ThirdPlaceMatchFoundation,
  listWorldCup2026PredictionHistory,
  resolveWorldCup2026KnockoutWinnersFoundation
} from "@world-cup-2026-predictor/api";
import type { PredictionHistoryListSummary } from "@world-cup-2026-predictor/api";
import { HomeDashboard } from "../src/components/HomeDashboardSections";
import { DAILY_MATCHES_DISPLAY_TIMEZONE } from "../src/lib/daily-matches-ui";
import {
  buildGeneratedFeaturedPrediction,
  buildHomeModelTrackRecordMetrics,
  selectFallbackFeaturedFixture,
  selectHomeGroups,
  selectHomeMatches,
  selectStoredFeaturedPrediction
} from "../src/lib/home-dashboard";
import { predictDashboardMatchFromLiveElo } from "../src/lib/api-client";
import {
  buildDashboardDailyMatchesFromSync,
  buildDashboardStandingsFromSync,
  getDashboardLiveSyncResult,
  getProductionRuntimeDiagnostics
} from "../src/lib/server-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getHomePredictionHistorySummary(): Promise<PredictionHistoryListSummary | null> {
  try {
    const response = await listWorldCup2026PredictionHistory({
      evaluationState: "all",
      sort: "captured_desc",
      page: 1,
      pageSize: 10
    });

    return response.status === "success" ? response.summary : null;
  } catch {
    return null;
  }
}

export default async function DashboardHomePage() {
  const syncResult = await getDashboardLiveSyncResult();
  const runtimeDiagnostics = await getProductionRuntimeDiagnostics(syncResult);
  const standings = buildDashboardStandingsFromSync(syncResult);
  const dailyMatches = buildDashboardDailyMatchesFromSync(syncResult, { timezone: DAILY_MATCHES_DISPLAY_TIMEZONE });
  const fixtureFoundation = getWorldCup2026FixtureFoundation();
  const modelInfo = getModelInfo();
  const tournamentResolution = resolveWorldCup2026KnockoutWinnersFoundation();
  const thirdPlaceMatch = getWorldCup2026ThirdPlaceMatchFoundation();
  const predictionHistorySummary = await getHomePredictionHistorySummary();

  const homeMatches = selectHomeMatches(dailyMatches);
  const storedFeaturedPrediction = selectStoredFeaturedPrediction(dailyMatches);
  const fallbackFeaturedFixture =
    storedFeaturedPrediction === null ? selectFallbackFeaturedFixture(fixtureFoundation) : null;
  const fallbackPrediction =
    fallbackFeaturedFixture === null
      ? null
      : predictDashboardMatchFromLiveElo({
          homeTeam: fallbackFeaturedFixture.homeTeam,
          awayTeam: fallbackFeaturedFixture.awayTeam,
          maxGoals: 6,
          mostLikelyScorelineLimit: 3,
          preset: "balanced"
        });
  const featuredPrediction =
    storedFeaturedPrediction ??
    (fallbackFeaturedFixture !== null && fallbackPrediction?.status === "success"
      ? buildGeneratedFeaturedPrediction(fallbackFeaturedFixture, fallbackPrediction)
      : null);
  const formulaVersion = fallbackPrediction?.status === "success" ? fallbackPrediction.expectedGoals.formulaVersion : undefined;

  return (
    <HomeDashboard
      runtimeDiagnostics={runtimeDiagnostics}
      dailyMatches={dailyMatches}
      homeMatches={homeMatches}
      featuredPrediction={featuredPrediction}
      groups={selectHomeGroups(standings, dailyMatches)}
      tournamentResolution={tournamentResolution}
      thirdPlaceMatch={thirdPlaceMatch}
      modelTrackRecordMetrics={buildHomeModelTrackRecordMetrics(predictionHistorySummary)}
      modelVersion={modelInfo.modelPackage}
      formulaVersion={featuredPrediction?.source === "generated_fixture" ? formulaVersion : undefined}
    />
  );
}
