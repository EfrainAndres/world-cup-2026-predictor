import type { LiveEloRatingsFoundationResponse } from "../lib/api-client";
import { formatElo } from "../lib/api-client";
import { LiveEloRatingCard } from "./LiveEloRatingCard";
import { SectionHeader } from "./SectionHeader";
import { StatusPill } from "./StatusPill";

interface LiveEloRatingsSectionProps {
  liveEloRatings: LiveEloRatingsFoundationResponse;
}

const REQUIRED_WARNING_LABELS = [
  {
    key: "partial_international_history",
    label: "Partial international history"
  },
  {
    key: "curated_sample_only",
    label: "Curated sample only"
  },
  {
    key: "not_complete_global_match_history",
    label: "Not complete global match history"
  }
] as const;

function hasWarning(warnings: readonly string[], key: string): boolean {
  return warnings.some((warning) => warning.toLocaleLowerCase().includes(key));
}

export function LiveEloRatingsSection({ liveEloRatings }: LiveEloRatingsSectionProps) {
  return (
    <section id="live-elo-ratings" aria-labelledby="live-elo-ratings-title" className="py-8">
      <SectionHeader
        eyebrow="Live Elo"
        titleId="live-elo-ratings-title"
        title="Computed ratings from the current curated match dataset"
        description="The live Elo pipeline runs through the local API foundation and ranks teams from available World Cup fixtures plus the expanded partial international sample."
      />

      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Live Elo is based on partial curated data and is not a public accuracy claim.</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          Use this section to inspect current pipeline coverage and warnings before treating ratings as model evidence.
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          Auto Predict covers all 48 expected World Cup 2026 teams. Teams not in this dataset use a fallback seed rating of 1500 — not calibrated from match data.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Matches processed</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{liveEloRatings.matchesProcessed}</p>
          <p className="mt-1 text-xs text-slate-400">Curated local fixtures</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Teams in dataset</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{liveEloRatings.teamsRatedTotal}</p>
          <p className="mt-1 text-xs text-slate-400">Curated dataset · {liveEloRatings.teams.length} shown</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top Elo rating</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{formatElo(liveEloRatings.topEloRating)}</p>
          <p className="mt-1 text-xs text-slate-400">{liveEloRatings.teams[0]?.team ?? "No teams"}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Latest match date</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{liveEloRatings.latestMatchDate}</p>
          <p className="mt-1 text-xs text-slate-400">From local data</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Data coverage</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{liveEloRatings.dataCoverage}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">Scope: {liveEloRatings.dataScope}</p>
          </div>
          <StatusPill label={liveEloRatings.pipelineVersion} tone="neutral" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {REQUIRED_WARNING_LABELS.map((warning) => (
            <StatusPill
              key={warning.key}
              label={warning.label}
              tone={hasWarning(liveEloRatings.warnings, warning.key) ? "warning" : "neutral"}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {liveEloRatings.teams.map((entry) => (
          <LiveEloRatingCard key={entry.team} entry={entry} />
        ))}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-950">Warnings</h3>
        <ul className="mt-2 grid gap-2 text-xs leading-5 text-slate-600 lg:grid-cols-2">
          {liveEloRatings.warnings.map((warning) => (
            <li key={warning} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              {warning}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
