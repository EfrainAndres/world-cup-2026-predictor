import type { HistoricalReplayAuditResponse, HistoricalTournamentSummary } from "@world-cup-2026-predictor/api";
import { HistoricalTournamentCard } from "./HistoricalTournamentCard";
import { SectionHeader } from "./SectionHeader";
import { StatusPill } from "./StatusPill";

interface HistoricalValidationSectionProps {
  tournaments: HistoricalTournamentSummary[];
  audit: HistoricalReplayAuditResponse;
}

export function HistoricalValidationSection({ tournaments, audit }: HistoricalValidationSectionProps) {
  const supportedYearSet = new Set<number>(audit.supportedYears);

  const components = [
    ["Dataset completeness", audit.componentAvailability.datasetCompleteness],
    ["Bracket reconstruction", audit.componentAvailability.bracketReconstruction],
    ["Elo snapshot replay", audit.componentAvailability.eloSnapshotReplay],
    ["Monte Carlo replay", audit.componentAvailability.monteCarloReplay],
    ["Replay validation", audit.componentAvailability.replayValidation]
  ] as const;

  return (
    <section id="historical-validation" aria-labelledby="historical-validation-title" className="mt-12">
      <SectionHeader
        eyebrow="Historical validation"
        titleId="historical-validation-title"
        title="Replay audit and tournament summaries"
        description="Historical validation checks model quality against past World Cup results. These outputs are used for model auditing and do not represent a public accuracy guarantee."
      />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Aggregate audit status</p>
            <p className="mt-1 text-base font-semibold text-slate-950">
              {audit.supportedYears.length} years in replay scope
            </p>
          </div>
          <StatusPill label={audit.apiReadiness.replaceAll("_", " ")} tone="warning" />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {components.map(([label, available]) => (
            <div key={label} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <dt className="text-sm text-slate-600">{label}</dt>
              <dd className="text-sm font-semibold text-slate-950">{available ? "Available" : "Missing"}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Audit disclaimer</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Historical validation is used for model auditing, not a public accuracy guarantee.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tournaments.map((tournament) => (
          <HistoricalTournamentCard
            key={tournament.year}
            tournament={tournament}
            replaySupported={supportedYearSet.has(tournament.year)}
          />
        ))}
      </div>
    </section>
  );
}
