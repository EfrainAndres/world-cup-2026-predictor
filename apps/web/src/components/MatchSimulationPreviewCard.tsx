import type { SimulateMatchSuccessResponse } from "@world-cup-2026-predictor/api";
import { formatPercent } from "../lib/api-client";
import { StatusPill } from "./StatusPill";

interface MatchSimulationPreviewCardProps {
  matchPreview: SimulateMatchSuccessResponse;
}

export function MatchSimulationPreviewCard({ matchPreview }: MatchSimulationPreviewCardProps) {
  const outcomes = [
    { label: `${matchPreview.request.homeTeam} win`, value: matchPreview.outcomeProbabilities.homeWinProbability },
    { label: "Draw", value: matchPreview.outcomeProbabilities.drawProbability },
    { label: `${matchPreview.request.awayTeam} win`, value: matchPreview.outcomeProbabilities.awayWinProbability }
  ];

  return (
    <section id="match-preview" aria-labelledby="match-preview-title" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Match simulation preview</p>
          <h3 id="match-preview-title" className="mt-1 text-xl font-semibold text-slate-950">
            {matchPreview.request.homeTeam} vs {matchPreview.request.awayTeam}
          </h3>
        </div>
        <StatusPill label="Caller supplied xG" tone="warning" />
      </div>

      <dl className="mt-6 space-y-3">
        {outcomes.map((outcome) => (
          <div key={outcome.label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0">
            <dt className="text-sm font-medium text-slate-600">{outcome.label}</dt>
            <dd className="text-base font-semibold tabular-nums text-slate-950">{formatPercent(outcome.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-900">Most likely scorelines</h4>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {matchPreview.mostLikelyScorelines.map((scoreline) => (
            <li key={`${scoreline.homeGoals}-${scoreline.awayGoals}`} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-950">
                {scoreline.homeGoals}-{scoreline.awayGoals}
              </span>
              <span className="ml-2 text-slate-600">{formatPercent(scoreline.probability)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-600">{matchPreview.warnings[0]}</p>
    </section>
  );
}
