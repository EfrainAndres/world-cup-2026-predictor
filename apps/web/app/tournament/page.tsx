import React from "react";
import type { Metadata } from "next";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { TournamentRoundNav } from "../../src/components/TournamentRoundNav";
import { TournamentChampionOutlook } from "../../src/components/TournamentChampionOutlook";
import { WorldCupKnockoutBracketSection } from "../../src/components/WorldCupKnockoutBracketSection";
import { WorldCupRoundOf32Section } from "../../src/components/WorldCupRoundOf32Section";
import { WorldCupRoundOf16SimulationSection } from "../../src/components/WorldCupRoundOf16SimulationSection";
import { WorldCupRoundOf16MatchSimulationSection } from "../../src/components/WorldCupRoundOf16MatchSimulationSection";
import { WorldCupQuarterfinalSimulationSection } from "../../src/components/WorldCupQuarterfinalSimulationSection";
import { WorldCupQuarterfinalMatchSimulationSection } from "../../src/components/WorldCupQuarterfinalMatchSimulationSection";
import { WorldCupSemifinalSimulationSection } from "../../src/components/WorldCupSemifinalSimulationSection";
import { WorldCupSemifinalMatchSimulationSection } from "../../src/components/WorldCupSemifinalMatchSimulationSection";
import { WorldCupFinalSimulationSection } from "../../src/components/WorldCupFinalSimulationSection";
import { WorldCupFinalMatchSimulationSection } from "../../src/components/WorldCupFinalMatchSimulationSection";
import { WorldCupThirdPlaceMatchSection } from "../../src/components/WorldCupThirdPlaceMatchSection";
import { WorldCupThirdPlaceMatchSimulationSection } from "../../src/components/WorldCupThirdPlaceMatchSimulationSection";
import { WorldCupKnockoutSimulationSection } from "../../src/components/WorldCupKnockoutSimulationSection";
import { WorldCupKnockoutWinnerResolutionSection } from "../../src/components/WorldCupKnockoutWinnerResolutionSection";
import { TournamentSimulationSection } from "../../src/components/TournamentSimulationSection";
import { getDashboardSnapshot } from "../../src/lib/api-client";

export const metadata: Metadata = {
  title: "Tournament · World Cup 2026 Predictor"
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function TournamentPage() {
  const snapshot = getDashboardSnapshot();
  const resolution = snapshot.worldCup2026KnockoutWinnerResolution;
  const thirdPlaceMatch = snapshot.worldCup2026ThirdPlaceMatch;
  const roundOf32 = snapshot.worldCup2026RoundOf32;

  return (
    <PageContainer className="py-8">
      {/* 1. Page header + tournament status */}
      <div className="mb-6">
        <PageHeader
          eyebrow="World Cup 2026"
          title="Tournament"
          description="Projected knockout bracket, round-by-round simulation, champion outlook, and Third Place match."
        />
      </div>

      {/* Tournament status */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="flex flex-wrap gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Qualified teams</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{roundOf32.totalQualifiedTeams}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">R32 fixtures</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{roundOf32.fixturesCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Resolved knockout fixtures</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{resolution.totalResolvedFixtures}</dd>
            </div>
          </dl>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Projected
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Projection is deterministic and based on pre-match probabilities only. Extra time, penalties, live results, injuries, and lineups are not modeled.
        </p>
      </div>

      {/* Round navigation */}
      <div className="mb-6">
        <TournamentRoundNav />
      </div>

      {/* 2. Champion outlook */}
      <TournamentChampionOutlook
        resolution={resolution}
        thirdPlaceMatch={thirdPlaceMatch}
      />

      {/* 3. Knockout bracket */}
      <section id="tournament-bracket" aria-labelledby="tournament-bracket-heading" className="mb-8">
        <h2 id="tournament-bracket-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Knockout bracket
        </h2>
        <WorldCupKnockoutBracketSection knockoutBracket={snapshot.worldCup2026KnockoutBracket} />
      </section>

      {/* 4–5. Stage summaries — grouped by round with anchors */}
      <section id="tournament-round-of-32" aria-labelledby="tournament-r32-heading" className="mb-8">
        <h2 id="tournament-r32-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Round of 32
        </h2>
        <WorldCupRoundOf32Section roundOf32Foundation={snapshot.worldCup2026RoundOf32} />
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            R32 simulation details
          </summary>
          <div className="mt-4">
            <WorldCupKnockoutSimulationSection knockoutSimulation={snapshot.worldCup2026KnockoutSimulation} />
          </div>
        </details>
      </section>

      <section id="tournament-round-of-16" aria-labelledby="tournament-r16-heading" className="mb-8">
        <h2 id="tournament-r16-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Round of 16
        </h2>
        <WorldCupRoundOf16SimulationSection roundOf16={snapshot.worldCup2026RoundOf16} />
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            R16 match-by-match details
          </summary>
          <div className="mt-4">
            <WorldCupRoundOf16MatchSimulationSection roundOf16MatchSimulation={snapshot.worldCup2026RoundOf16MatchSimulation} />
          </div>
        </details>
      </section>

      <section id="tournament-quarterfinals" aria-labelledby="tournament-qf-heading" className="mb-8">
        <h2 id="tournament-qf-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Quarterfinals
        </h2>
        <WorldCupQuarterfinalSimulationSection quarterfinal={snapshot.worldCup2026Quarterfinal} />
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            QF match-by-match details
          </summary>
          <div className="mt-4">
            <WorldCupQuarterfinalMatchSimulationSection quarterfinalMatchSimulation={snapshot.worldCup2026QuarterfinalMatchSimulation} />
          </div>
        </details>
      </section>

      <section id="tournament-semifinals" aria-labelledby="tournament-sf-heading" className="mb-8">
        <h2 id="tournament-sf-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Semifinals
        </h2>
        <WorldCupSemifinalSimulationSection semifinal={snapshot.worldCup2026Semifinal} />
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            SF match-by-match details
          </summary>
          <div className="mt-4">
            <WorldCupSemifinalMatchSimulationSection semifinalMatchSimulation={snapshot.worldCup2026SemifinalMatchSimulation} />
          </div>
        </details>
      </section>

      <section id="tournament-final" aria-labelledby="tournament-final-heading" className="mb-8">
        <h2 id="tournament-final-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Final
        </h2>
        <WorldCupFinalSimulationSection finalFoundation={snapshot.worldCup2026Final} />
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Final match details
          </summary>
          <div className="mt-4">
            <WorldCupFinalMatchSimulationSection finalMatchSimulation={snapshot.worldCup2026FinalMatchSimulation} />
          </div>
        </details>
      </section>

      <section id="tournament-third-place" aria-labelledby="tournament-3p-heading" className="mb-8">
        <h2 id="tournament-3p-heading" className="mb-4 text-lg font-semibold text-slate-950">
          Third Place Match
        </h2>
        <WorldCupThirdPlaceMatchSection thirdPlaceMatch={snapshot.worldCup2026ThirdPlaceMatch} />
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Third place match details
          </summary>
          <div className="mt-4">
            <WorldCupThirdPlaceMatchSimulationSection thirdPlaceMatchSimulation={snapshot.worldCup2026ThirdPlaceMatchSimulation} />
          </div>
        </details>
      </section>

      {/* 6. Technical / projection disclosure */}
      <details className="group mb-8">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden="true">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
          Projection methodology and full resolution tree
        </summary>
        <div className="mt-6 space-y-8">
          <WorldCupKnockoutWinnerResolutionSection resolution={resolution} />
          <TournamentSimulationSection
            simulation={snapshot.tournamentSimulation}
            modelInfo={snapshot.modelInfo}
          />
        </div>
      </details>
    </PageContainer>
  );
}
