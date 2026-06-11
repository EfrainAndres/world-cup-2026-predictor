import type { HistoricalTournamentSummary } from "@world-cup-2026-predictor/api";
import { StatusPill } from "./StatusPill";

interface HistoricalTournamentCardProps {
  tournament: HistoricalTournamentSummary;
  replaySupported: boolean;
}

export function HistoricalTournamentCard({ tournament, replaySupported }: HistoricalTournamentCardProps) {
  const datasetLabel = tournament.datasetStatus.replace(/_/g, " ");
  const foundationWarning = tournament.warnings[0] ?? null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">{tournament.year}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{tournament.tournamentName}</h3>
        </div>
        <StatusPill
          label={replaySupported ? "Replay supported" : "Not in replay"}
          tone={replaySupported ? "success" : "neutral"}
        />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Champion</dt>
          <dd className="font-semibold text-slate-950">{tournament.champion}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Runner-up</dt>
          <dd className="font-semibold text-slate-950">{tournament.runnerUp}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Matches</dt>
          <dd className="font-semibold text-slate-950">
            {tournament.matchCount}/{tournament.expectedMatchCount}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="shrink-0 text-slate-500">Dataset status</dt>
          <dd className="text-right font-semibold text-slate-950">{datasetLabel}</dd>
        </div>
      </dl>

      {foundationWarning !== null && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs leading-5 text-amber-900">{foundationWarning}</p>
        </div>
      )}
    </article>
  );
}
