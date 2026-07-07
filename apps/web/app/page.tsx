import {
  getModelInfo,
  getWorldCup2026FixtureFoundation
} from "@world-cup-2026-predictor/api";
import { HomeDashboard } from "../src/components/HomeDashboardSections";
import { DAILY_MATCHES_DISPLAY_TIMEZONE } from "../src/lib/daily-matches-ui";
import {
  buildGeneratedFeaturedPrediction,
  buildHomeModelTrackRecordMetrics,
  selectFallbackFeaturedFixture,
  selectHomeGroups,
  selectHomeMatches,
  selectStoredFeaturedPrediction,
  type HomeModelTrackRecordInput
} from "../src/lib/home-dashboard";
import { getEvidenceCountTaxonomy } from "../src/lib/model-evidence-center";
import {
  buildDashboardDailyMatchesFromSync,
  buildDashboardStandingsFromSync,
  buildOfficialWorldCup2026KnockoutProjectionWithProductionStatsBomb,
  getDashboardLiveSyncResult,
  getModelEvidenceCenterData,
  getProductionRuntimeDiagnostics,
  predictDashboardMatchFromLiveEloWithProductionStatsBomb
} from "../src/lib/server-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Uses the same evidence source and count taxonomy as the /model page so the
// Home track record never shows a number that reads as inconsistent with the
// Model and Evidence Center.
async function getHomeModelTrackRecordInput(): Promise<HomeModelTrackRecordInput | null> {
  try {
    const data = await getModelEvidenceCenterData();
    const taxonomy = getEvidenceCountTaxonomy({
      snapshotCount: data.snapshotCount,
      evaluationCount: data.evaluationCount,
      gateReport: data.gateReport
    });

    return { taxonomy, outcomeAccuracy: data.realitySummary?.outcomeAccuracy ?? null };
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
  const tournamentProjection = buildOfficialWorldCup2026KnockoutProjectionWithProductionStatsBomb(syncResult);
  const modelTrackRecordInput = await getHomeModelTrackRecordInput();

  const homeMatches = selectHomeMatches(dailyMatches);
  const storedFeaturedPrediction = selectStoredFeaturedPrediction(dailyMatches);
  const fallbackFeaturedFixture =
    storedFeaturedPrediction === null ? selectFallbackFeaturedFixture(fixtureFoundation) : null;
  const fallbackPrediction =
    fallbackFeaturedFixture === null
      ? null
      : predictDashboardMatchFromLiveEloWithProductionStatsBomb({
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
      tournamentProjection={tournamentProjection}
      modelTrackRecordMetrics={buildHomeModelTrackRecordMetrics(modelTrackRecordInput)}
      modelVersion={modelInfo.modelPackage}
      formulaVersion={featuredPrediction?.source === "generated_fixture" ? formulaVersion : undefined}
    />
  );
}
