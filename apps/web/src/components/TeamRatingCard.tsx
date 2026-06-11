import type { TeamRatingEntry, TeamRatingTier } from "../lib/api-client";
import { StatusPill } from "./StatusPill";

const tierTone: Record<TeamRatingTier, "success" | "neutral" | "warning"> = {
  Elite: "success",
  Strong: "neutral",
  Competitive: "warning"
};

interface TeamRatingCardProps {
  entry: TeamRatingEntry;
}

export function TeamRatingCard({ entry }: TeamRatingCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-400">Rank {entry.rank}</p>
        <StatusPill label={entry.tier} tone={tierTone[entry.tier]} />
      </div>

      <h3 className="mt-2 text-base font-semibold text-slate-950">{entry.team}</h3>

      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{entry.eloRating}</p>
      <p className="text-xs text-slate-400">Elo rating</p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Offense</dt>
          <dd className="font-semibold tabular-nums text-slate-950">{entry.offenseStrength}/100</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Defense</dt>
          <dd className="font-semibold tabular-nums text-slate-950">{entry.defenseStrength}/100</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-5 text-slate-500">{entry.summary}</p>
    </article>
  );
}
