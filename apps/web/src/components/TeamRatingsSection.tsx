import type { TeamRatingsFoundation } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";
import { TeamRatingCard } from "./TeamRatingCard";

interface TeamRatingsSectionProps {
  teamRatings: TeamRatingsFoundation;
}

export function TeamRatingsSection({ teamRatings }: TeamRatingsSectionProps) {
  return (
    <section id="team-ratings" aria-labelledby="team-ratings-title" className="py-8">
      <SectionHeader
        eyebrow="Team ratings"
        titleId="team-ratings-title"
        title="World Cup 2026 contender strength overview"
        description="Foundation Elo-based ratings for the top World Cup 2026 contenders. These are approximate seed ratings for dashboard preview — not derived from a live model or official FIFA rankings."
      />

      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Foundation data</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">{teamRatings.foundationWarning}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Teams rated</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{teamRatings.teams.length}</p>
          <p className="mt-1 text-xs text-slate-400">Top World Cup contenders</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top Elo rating</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{teamRatings.topEloRating}</p>
          <p className="mt-1 text-xs text-slate-400">{teamRatings.teams[0]?.team ?? "—"}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Average Elo (top 10)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{teamRatings.averageEloRating}</p>
          <p className="mt-1 text-xs text-slate-400">Across ranked teams</p>
        </div>

        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
          <p className="text-sm text-teal-700">Strongest offense</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-teal-950">{teamRatings.strongestOffenseScore}/100</p>
          <p className="mt-1 text-xs font-semibold text-teal-800">{teamRatings.strongestOffenseTeam}</p>
        </div>

        <div className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
          <p className="text-sm text-teal-700">Strongest defense</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-teal-950">{teamRatings.strongestDefenseScore}/100</p>
          <p className="mt-1 text-xs font-semibold text-teal-800">{teamRatings.strongestDefenseTeam}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {teamRatings.teams.map((entry) => (
          <TeamRatingCard key={entry.team} entry={entry} />
        ))}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs leading-5 text-slate-500">
          <span className="font-semibold text-slate-700">Rating source:</span> {teamRatings.ratingSource}
        </p>
      </div>
    </section>
  );
}
