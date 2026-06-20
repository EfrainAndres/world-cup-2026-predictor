import type { WorldCup2026DailyMatchEntry } from "../lib/api-client";
import {
  formatUtcTimestamp,
  getDailyMatchStateClasses,
  getDailyMatchStateLabel,
  shouldShowDailyMatchScore
} from "../lib/daily-matches-ui";

interface DailyMatchCardProps {
  match: WorldCup2026DailyMatchEntry;
}

export function DailyMatchCard({ match }: DailyMatchCardProps) {
  const showScore = shouldShowDailyMatchScore(match);

  return (
    <article
      aria-label={`${match.homeTeam} vs ${match.awayTeam}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {match.group === undefined ? "World Cup 2026" : `${match.group}${match.matchday === undefined ? "" : ` · Matchday ${match.matchday}`}`}
          </p>
          <h3 className="text-lg font-semibold text-slate-950">
            {match.homeTeam} <span className="text-slate-400">vs</span> {match.awayTeam}
          </h3>
          {match.localizedKickoff !== undefined ? (
            <p className="text-sm text-slate-600">Kickoff: {match.localizedKickoff}</p>
          ) : (
            <p className="text-sm text-slate-500">Kickoff metadata unavailable</p>
          )}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDailyMatchStateClasses(match.state)}`}>
          {getDailyMatchStateLabel(match.state)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {showScore ? `${match.homeScore} - ${match.awayScore}` : "Not available"}
          </p>
        </div>

        <div className="min-w-[12rem] text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prediction snapshot</p>
          {match.predictionSnapshot.available ? (
            <div className="mt-1 space-y-1 text-sm text-slate-700">
              <p className="font-medium text-teal-800">Pre-match prediction saved</p>
              {match.predictionSnapshot.modelVersion !== undefined ? (
                <p>Model: {match.predictionSnapshot.modelVersion}</p>
              ) : null}
              {match.predictionSnapshot.capturedAt !== undefined ? (
                <p>Captured: {formatUtcTimestamp(match.predictionSnapshot.capturedAt)}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No saved snapshot</p>
          )}
        </div>
      </div>
    </article>
  );
}
