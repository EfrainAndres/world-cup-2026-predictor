import { AppHeader } from "../src/components/AppHeader";
import { HistoricalReplayAuditPreviewCard } from "../src/components/HistoricalReplayAuditPreviewCard";
import { HistoricalValidationSection } from "../src/components/HistoricalValidationSection";
import { LiveEloRatingsSection } from "../src/components/LiveEloRatingsSection";
import { MatchSimulationForm } from "../src/components/MatchSimulationForm";
import { ModelStatusCard } from "../src/components/ModelStatusCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { TeamRatingsSection } from "../src/components/TeamRatingsSection";
import { TournamentSimulationSection } from "../src/components/TournamentSimulationSection";
import { WorldCupGroupsSection } from "../src/components/WorldCupGroupsSection";
import { WorldCupKnockoutBracketSection } from "../src/components/WorldCupKnockoutBracketSection";
import { WorldCupRoundOf32Section } from "../src/components/WorldCupRoundOf32Section";
import { WorldCupStandingsSection } from "../src/components/WorldCupStandingsSection";
import { getDashboardSnapshot } from "../src/lib/api-client";

export default function DashboardHomePage() {
  const snapshot = getDashboardSnapshot();

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
                This first dashboard surface connects directly to the local API foundation. It previews model status, a deterministic
                match simulation, live Elo ratings from partial curated data, historical replay readiness, and curated historical
                tournament summaries.
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

        <section aria-labelledby="match-section-title" className="py-8">
          <SectionHeader
            eyebrow="Match preview"
            titleId="match-section-title"
            title="Interactive match simulation"
            description="Enter teams and expected goals to run a local API simulation. The output is a baseline scenario, not a published forecast."
          />
          <div className="mt-6">
            <MatchSimulationForm initialResult={snapshot.matchPreview} />
          </div>
        </section>

        <LiveEloRatingsSection liveEloRatings={snapshot.liveEloRatings} />

        <TeamRatingsSection teamRatings={snapshot.teamRatings} />

        <WorldCupGroupsSection fixtureFoundation={snapshot.worldCup2026Fixtures} />

        <WorldCupStandingsSection standingsFoundation={snapshot.worldCup2026Standings} />

        <WorldCupRoundOf32Section roundOf32Foundation={snapshot.worldCup2026RoundOf32} />

        <WorldCupKnockoutBracketSection knockoutBracket={snapshot.worldCup2026KnockoutBracket} />

        <TournamentSimulationSection
          simulation={snapshot.tournamentSimulation}
          modelInfo={snapshot.modelInfo}
        />

        <HistoricalValidationSection
          tournaments={snapshot.historicalTournaments}
          audit={snapshot.historicalReplayAudit}
        />
      </main>
    </div>
  );
}
