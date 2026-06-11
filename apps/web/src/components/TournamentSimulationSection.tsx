import type { ModelInfoResponse, TournamentSimulationSuccessResponse } from "@world-cup-2026-predictor/api";
import { SectionHeader } from "./SectionHeader";
import { StatusPill } from "./StatusPill";
import { TournamentProbabilityCard } from "./TournamentProbabilityCard";

interface TournamentSimulationSectionProps {
  simulation: TournamentSimulationSuccessResponse;
  modelInfo: ModelInfoResponse;
}

export function TournamentSimulationSection({ simulation, modelInfo }: TournamentSimulationSectionProps) {
  return (
    <section id="tournament-simulation" aria-labelledby="tournament-simulation-title" className="py-8">
      <SectionHeader
        eyebrow="Tournament simulation"
        titleId="tournament-simulation-title"
        title="Foundation champion and runner-up estimates"
        description="This section previews the tournament simulation engine using a live local 8-team sample tournament. The probabilities below are generated from a seeded deterministic run, not calibrated from real pre-tournament data."
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Simulation engine</p>
            <p className="mt-1 text-base font-semibold text-slate-950">Monte Carlo — Poisson, simplified bracket</p>
          </div>
          <StatusPill label="Live local simulation" tone="neutral" />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Simulation runs</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">{simulation.simulationCount.toLocaleString()}</dd>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <dt className="text-sm text-slate-500">Data scope</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">8-team sample foundation tournament</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Foundation warning</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-950">
            {simulation.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-700">
          Champion probability estimates — {simulation.tournamentName}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Live local simulation foundation, not a public forecast.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {simulation.teamResults.map((entry) => (
            <TournamentProbabilityCard key={entry.team} entry={entry} />
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Model limitations</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          {modelInfo.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-5">
        <p className="text-sm font-semibold text-teal-800">Use match simulation for current model output</p>
        <p className="mt-2 text-sm leading-6 text-teal-700">
          A tournament simulation API handler is now live and used above. See the{" "}
          <a href="#match-section-title" className="font-semibold underline hover:no-underline">
            interactive match simulation
          </a>{" "}
          section for match-level analysis.
        </p>
      </div>
    </section>
  );
}
