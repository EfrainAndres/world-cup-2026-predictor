import React from "react";
import type { WorldCup2026DailyMatchEntry } from "../lib/api-client";
import {
  formatDailyMatchProbability,
  formatEvaluationExactScoreLabel,
  formatEvaluationOutcomeLabel,
  formatUtcTimestamp,
  getDailyMatchHistoryState,
  getDailyMatchPredictionLabel,
  getDailyMatchScoreLabel,
  getDailyMatchStateClasses,
  getDailyMatchStateLabel,
  shouldShowDailyMatchScore
} from "../lib/daily-matches-ui";

interface DailyMatchCardProps {
  match: WorldCup2026DailyMatchEntry;
}

export function DailyMatchCard({ match }: DailyMatchCardProps) {
  const showScore = shouldShowDailyMatchScore(match);
  const historyState = getDailyMatchHistoryState(match);
  const prediction = match.predictionHistory.snapshot.prediction;
  const evaluation = match.predictionHistory.evaluation;

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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{getDailyMatchScoreLabel(match.state)}</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {showScore ? `${match.homeScore} - ${match.awayScore}` : "Not available"}
          </p>
        </div>

      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {getDailyMatchPredictionLabel(historyState)}
          </p>
          {!match.predictionHistory.snapshot.available || prediction === undefined ? (
            <p className="mt-2 text-sm text-slate-600">No pre-match prediction saved</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm text-slate-700">
              {match.predictionHistory.snapshot.status === "foundation_unverified" ? (
                <p className="font-medium text-amber-800">Foundation-unverified snapshot</p>
              ) : null}
              <p className="font-medium text-slate-950">
                Projected score:{" "}
                {prediction.projectedScoreline === undefined
                  ? "Unavailable"
                  : `${prediction.projectedScoreline.homeGoals} - ${prediction.projectedScoreline.awayGoals}`}
              </p>
              <p>
                1X2: {formatDailyMatchProbability(prediction.homeWinProbability)} / {formatDailyMatchProbability(prediction.drawProbability)} /{" "}
                {formatDailyMatchProbability(prediction.awayWinProbability)}
              </p>
              <p>
                xG: {prediction.homeExpectedGoals.toFixed(2)} - {prediction.awayExpectedGoals.toFixed(2)}
              </p>
              {prediction.confidenceLevel !== undefined ? <p>Confidence: {prediction.confidenceLevel}</p> : null}
              {prediction.coverageType !== undefined ? <p>Coverage: {prediction.coverageType}</p> : null}
              {match.predictionHistory.snapshot.modelVersion !== undefined ? (
                <p>Model: {match.predictionHistory.snapshot.modelVersion}</p>
              ) : null}
              {match.predictionHistory.snapshot.capturedAt !== undefined ? (
                <p>Captured: {formatUtcTimestamp(match.predictionHistory.snapshot.capturedAt)}</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model evaluation</p>
          {match.state !== "final" ? (
            <p className="mt-2 text-sm text-slate-600">Evaluation is available after a completed final result only.</p>
          ) : !match.predictionHistory.snapshot.available ? (
            <p className="mt-2 text-sm text-slate-600">No pre-match prediction was saved for evaluation.</p>
          ) : !evaluation.available || evaluation.metrics === undefined ? (
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Evaluation pending</p>
              <p>Prediction saved</p>
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p>
                Outcome prediction: {formatEvaluationOutcomeLabel(evaluation.metrics.outcomeCorrect)}
              </p>
              <p>Exact score: {formatEvaluationExactScoreLabel(evaluation.metrics.exactScoreCorrect)}</p>
              <p>Brier Score: {evaluation.metrics.brierScore.toFixed(3)}</p>
              <p>Log Loss: {evaluation.metrics.logLoss.toFixed(3)}</p>
              <p>Total-goal absolute error: {evaluation.metrics.totalGoalAbsoluteError.toFixed(2)}</p>
              {evaluation.evaluatedAt !== undefined ? <p>Evaluated: {formatUtcTimestamp(evaluation.evaluatedAt)}</p> : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
