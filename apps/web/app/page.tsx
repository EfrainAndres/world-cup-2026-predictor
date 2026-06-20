import { AppHeader } from "../src/components/AppHeader";
import { HistoricalReplayAuditPreviewCard } from "../src/components/HistoricalReplayAuditPreviewCard";
import { HistoricalValidationSection } from "../src/components/HistoricalValidationSection";
import { LiveEloRatingsSection } from "../src/components/LiveEloRatingsSection";
import { MatchSimulationForm } from "../src/components/MatchSimulationForm";
import { ModelStatusCard } from "../src/components/ModelStatusCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { TeamRatingsSection } from "../src/components/TeamRatingsSection";
import { TodaysMatchesSection } from "../src/components/TodaysMatchesSection";
import { TournamentSimulationSection } from "../src/components/TournamentSimulationSection";
import { WorldCupFinalSimulationSection } from "../src/components/WorldCupFinalSimulationSection";
import { WorldCupFinalMatchSimulationSection } from "../src/components/WorldCupFinalMatchSimulationSection";
import { TournamentProjectionOverviewSection } from "../src/components/TournamentProjectionOverviewSection";
import { WorldCupChampionProjectionSummarySection } from "../src/components/WorldCupChampionProjectionSummarySection";
import { WorldCupKnockoutWinnerResolutionSection } from "../src/components/WorldCupKnockoutWinnerResolutionSection";
import { WorldCupThirdPlaceMatchSection } from "../src/components/WorldCupThirdPlaceMatchSection";
import { WorldCupThirdPlaceMatchSimulationSection } from "../src/components/WorldCupThirdPlaceMatchSimulationSection";
import { WorldCupGroupsSection } from "../src/components/WorldCupGroupsSection";
import { WorldCupKnockoutBracketSection } from "../src/components/WorldCupKnockoutBracketSection";
import { WorldCupKnockoutSimulationSection } from "../src/components/WorldCupKnockoutSimulationSection";
import { WorldCupQuarterfinalMatchSimulationSection } from "../src/components/WorldCupQuarterfinalMatchSimulationSection";
import { WorldCupQuarterfinalSimulationSection } from "../src/components/WorldCupQuarterfinalSimulationSection";
import { WorldCupRoundOf16MatchSimulationSection } from "../src/components/WorldCupRoundOf16MatchSimulationSection";
import { WorldCupRoundOf16SimulationSection } from "../src/components/WorldCupRoundOf16SimulationSection";
import { WorldCupRoundOf32Section } from "../src/components/WorldCupRoundOf32Section";
import { WorldCupSemifinalMatchSimulationSection } from "../src/components/WorldCupSemifinalMatchSimulationSection";
import { WorldCupSemifinalSimulationSection } from "../src/components/WorldCupSemifinalSimulationSection";
import { WorldCupStandingsSection } from "../src/components/WorldCupStandingsSection";
import { DAILY_MATCHES_DISPLAY_TIMEZONE } from "../src/lib/daily-matches-ui";
import { getDashboardDailyMatches, getDashboardSnapshot } from "../src/lib/api-client";

export default async function DashboardHomePage() {
  const snapshot = getDashboardSnapshot();
  const dailyMatches = await getDashboardDailyMatches({ timezone: DAILY_MATCHES_DISPLAY_TIMEZONE });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main id="overview" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section aria-labelledby="dashboard-title" className="pb-8">
          <p className="text-sm font-semibold uppercase text-teal-700">Dashboard foundation</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <h1 id="dashboard-title" className="max-w-4xl text-3xl font-semibold text-slate-950 sm:text-4xl">
                World Cup prediction signals with model limits in view
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                A full five-round World Cup 2026 knockout tournament projection — from Round of 32 through the Final — built on Live
                Elo ratings and a Poisson probability model. Includes deterministic champion and runner-up projection, third-place
                match simulation, and an interactive match simulation form. All predictions include data source metadata, partial-data
                warnings, and explicit model limitations.
              </p>
            </div>
            <aside aria-label="Dashboard boundary summary" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Server deployment</dt>
                  <dd className="font-semibold text-slate-950">Not added</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Database</dt>
                  <dd className="font-semibold text-slate-950">Disabled</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Charts</dt>
                  <dd className="font-semibold text-slate-950">Deferred</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section aria-labelledby="foundation-preview-title" className="py-8">
          <SectionHeader
            eyebrow="Foundation preview"
            titleId="foundation-preview-title"
            title="Current model and API evidence"
            description="The dashboard keeps model readiness, warnings, and historical replay context visible before richer prediction screens are added."
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ModelStatusCard health={snapshot.health} modelInfo={snapshot.modelInfo} />
            <HistoricalReplayAuditPreviewCard audit={snapshot.historicalReplayAudit} />
          </div>
        </section>

        <section id="match-preview" aria-labelledby="match-section-title" className="py-8">
          <SectionHeader
            eyebrow="Match preview"
            titleId="match-section-title"
            title="Interactive match simulation"
            description="Select an official World Cup fixture or switch to a custom matchup, then run a local API simulation. The output is a baseline scenario, not a published forecast."
          />
          <div className="mt-6">
            <MatchSimulationForm initialResult={snapshot.matchPreview} fixtureFoundation={snapshot.worldCup2026Fixtures} />
          </div>
        </section>

        <TodaysMatchesSection initialData={dailyMatches} />

        <LiveEloRatingsSection liveEloRatings={snapshot.liveEloRatings} />

        <TeamRatingsSection teamRatings={snapshot.teamRatings} />

        <div className="border-t border-slate-200 pb-2 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Summary</p>
        </div>

        <TournamentProjectionOverviewSection
          resolution={snapshot.worldCup2026KnockoutWinnerResolution}
          thirdPlaceMatch={snapshot.worldCup2026ThirdPlaceMatch}
        />

        <WorldCupChampionProjectionSummarySection resolution={snapshot.worldCup2026KnockoutWinnerResolution} />

        <div className="border-t border-slate-200 pb-2 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Projected final</p>
        </div>

        <WorldCupFinalMatchSimulationSection finalMatchSimulation={snapshot.worldCup2026FinalMatchSimulation} />

        <WorldCupFinalSimulationSection finalFoundation={snapshot.worldCup2026Final} />

        <div className="border-t border-slate-200 pb-2 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Projected semifinals</p>
        </div>

        <WorldCupSemifinalMatchSimulationSection semifinalMatchSimulation={snapshot.worldCup2026SemifinalMatchSimulation} />

        <WorldCupSemifinalSimulationSection semifinal={snapshot.worldCup2026Semifinal} />

        <div className="border-t border-slate-200 pb-2 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Projected quarterfinals</p>
        </div>

        <WorldCupQuarterfinalMatchSimulationSection quarterfinalMatchSimulation={snapshot.worldCup2026QuarterfinalMatchSimulation} />

        <WorldCupQuarterfinalSimulationSection quarterfinal={snapshot.worldCup2026Quarterfinal} />

        <div className="border-t border-slate-200 pb-2 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Projected early knockout</p>
        </div>

        <WorldCupRoundOf16MatchSimulationSection roundOf16MatchSimulation={snapshot.worldCup2026RoundOf16MatchSimulation} />

        <WorldCupRoundOf16SimulationSection roundOf16={snapshot.worldCup2026RoundOf16} />

        <WorldCupKnockoutSimulationSection knockoutSimulation={snapshot.worldCup2026KnockoutSimulation} />

        <WorldCupRoundOf32Section roundOf32Foundation={snapshot.worldCup2026RoundOf32} />

        <div className="border-t border-slate-200 pb-2 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Third place match</p>
        </div>

        <WorldCupThirdPlaceMatchSimulationSection thirdPlaceMatchSimulation={snapshot.worldCup2026ThirdPlaceMatchSimulation} />

        <WorldCupThirdPlaceMatchSection thirdPlaceMatch={snapshot.worldCup2026ThirdPlaceMatch} />

        <div className="border-t border-slate-200 pb-2 pt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Audit detail</p>
        </div>

        <WorldCupKnockoutWinnerResolutionSection resolution={snapshot.worldCup2026KnockoutWinnerResolution} />

        <WorldCupGroupsSection fixtureFoundation={snapshot.worldCup2026Fixtures} />

        <WorldCupStandingsSection standingsFoundation={snapshot.worldCup2026Standings} />

        <WorldCupKnockoutBracketSection knockoutBracket={snapshot.worldCup2026KnockoutBracket} />

        <TournamentSimulationSection
          simulation={snapshot.tournamentSimulation}
          modelInfo={snapshot.modelInfo}
        />

        <div id="historical">
          <HistoricalValidationSection
            tournaments={snapshot.historicalTournaments}
            audit={snapshot.historicalReplayAudit}
          />
        </div>
      </main>
    </div>
  );
}
