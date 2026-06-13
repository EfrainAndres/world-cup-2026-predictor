import type { LiveEloRatedTeamEntry } from "../lib/api-client";
import { formatElo } from "../lib/api-client";

interface LiveEloRatingCardProps {
  entry: LiveEloRatedTeamEntry;
}

export function LiveEloRatingCard({ entry }: LiveEloRatingCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-400">Rank {entry.rank}</p>
        <p className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
          {entry.matchesPlayed} matches
        </p>
      </div>

      <h3 className="mt-3 text-base font-semibold text-slate-950">{entry.team}</h3>

      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{formatElo(entry.eloRating)}</p>
      <p className="text-xs text-slate-400">Live foundation Elo rating</p>
    </article>
  );
}
