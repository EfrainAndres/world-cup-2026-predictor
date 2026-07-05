import React from "react";
import type { WorldCup2026GroupDetailMatch } from "../lib/api-client";
import {
  formatDailyMatchProbability,
  formatEvaluationExactScoreLabel,
  formatEvaluationOutcomeLabel,
  getDailyMatchHistoryState,
  getDailyMatchStateClasses,
  getDailyMatchStateLabel
} from "../lib/daily-matches-ui";
import { buildMatchResultDisplay } from "../lib/match-result-display";
import { MatchContextDisplay } from "./MatchContextDisplay";

interface GroupDetailMatchCardProps {
  match: WorldCup2026GroupDetailMatch;
}

export function GroupDetailMatchCard({ match }: GroupDetailMatchCardProps) {
  const resultDisplay = buildMatchResultDisplay(match);
  const historyState = getDailyMatchHistoryState(match);
  const prediction = match.predictionHistory.snapshot.prediction;
  const evaluation = match.predictionHistory.evaluation;

  return (
    <article
      aria-label={`${match.homeTeam} vs ${match.awayTeam}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          {match.matchday !== undefined && (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Matchday {match.matchday}
            </p>
          )}
          <p className="text-base font-semibold text-slate-950">
            {match.homeTeam} <span className="text-slate-400">vs</span> {match.awayTeam}
          </p>
          {match.localizedKickoff !== undefined ? (
            <p className="text-xs text-slate-600">{match.localizedKickoff}</p>
          ) : (
            <p className="text-xs text-slate-400">Kickoff unavailable</p>
          )}
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDailyMatchStateClasses(match.state)}`}>
          {getDailyMatchStateLabel(match.state)}
        </span>
      </div>

      {resultDisplay.showPrimaryScore && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {resultDisplay.primaryScoreLabel}
          </p>
          <p className="mt-0.5 text-lg font-semibold text-slate-950">
            {resultDisplay.primaryScoreText}
          </p>
          {resultDisplay.resultNote !== undefined ? (
            <p className="mt-1 text-sm font-medium text-slate-700">{resultDisplay.resultNote}</p>
          ) : null}
          {resultDisplay.detailRows.length > 0 ? (
            <dl className="mt-2 space-y-1 text-xs text-slate-600">
              {resultDisplay.detailRows.map((row) => (
                <div key={row.label} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-slate-500">{row.label}:</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      )}

      {match.matchContext !== undefined && (
        <MatchContextDisplay context={match.matchContext} />
      )}

      {historyState !== "no_snapshot" && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-semibold uppercase tracking-wide text-slate-500">Pre-match prediction</p>
          {prediction !== undefined ? (
            <div className="mt-1 space-y-0.5">
              {prediction.projectedScoreline !== undefined && (
                <p>
                  Projected: {prediction.projectedScoreline.homeGoals}–{prediction.projectedScoreline.awayGoals}
                </p>
              )}
              <p>
                xG: {prediction.homeExpectedGoals.toFixed(2)} – {prediction.awayExpectedGoals.toFixed(2)}
              </p>
              <p>
                1X2: {formatDailyMatchProbability(prediction.homeWinProbability)} /{" "}
                {formatDailyMatchProbability(prediction.drawProbability)} /{" "}
                {formatDailyMatchProbability(prediction.awayWinProbability)}
              </p>
              {prediction.confidenceLevel !== undefined && <p>Confidence: {prediction.confidenceLevel}</p>}
            </div>
          ) : (
            <p className="mt-1">No prediction saved</p>
          )}

          {match.state === "final" && evaluation.available && evaluation.metrics !== undefined && (
            <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-2">
              <p className="font-semibold uppercase tracking-wide text-slate-500">Evaluation</p>
              <p>Outcome: {formatEvaluationOutcomeLabel(evaluation.metrics.outcomeCorrect)}</p>
              <p>Exact score: {formatEvaluationExactScoreLabel(evaluation.metrics.exactScoreCorrect)}</p>
              <p>Brier: {evaluation.metrics.brierScore.toFixed(3)}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
