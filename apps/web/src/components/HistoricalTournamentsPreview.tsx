import type { HistoricalTournamentSummary } from "@world-cup-2026-predictor/api";

interface HistoricalTournamentsPreviewProps {
  tournaments: HistoricalTournamentSummary[];
}

export function HistoricalTournamentsPreview({ tournaments }: HistoricalTournamentsPreviewProps) {
  return (
    <section id="historical" aria-labelledby="historical-title" className="mt-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">Historical tournaments</p>
          <h2 id="historical-title" className="mt-2 text-2xl font-semibold text-slate-950">
            Curated replay years
          </h2>
        </div>
        <p className="text-sm text-slate-600">32-team historical format, not FIFA 2026 format.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tournaments.map((tournament) => (
          <article key={tournament.year} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-teal-700">{tournament.year}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">{tournament.tournamentName}</h3>
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
                <dd className="font-semibold text-slate-950">{tournament.matchCount}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
