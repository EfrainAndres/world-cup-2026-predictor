import type { TournamentSimulationTeamResult } from "@world-cup-2026-predictor/api";
import { formatPercent } from "../lib/api-client";

interface TournamentProbabilityCardProps {
  entry: TournamentSimulationTeamResult;
}

export function TournamentProbabilityCard({ entry }: TournamentProbabilityCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-400">Rank {entry.rank}</p>
      <h3 className="mt-1 text-base font-semibold text-slate-950">{entry.team}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Champion</dt>
          <dd className="font-semibold text-slate-950">{formatPercent(entry.championProbability)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Runner-up</dt>
          <dd className="font-semibold text-slate-950">{formatPercent(entry.runnerUpProbability)}</dd>
        </div>
      </dl>
    </article>
  );
}
