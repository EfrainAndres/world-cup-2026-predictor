import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import { PageContainer } from "../../../src/components/PageContainer";
import { TeamIdentity } from "../../../src/components/TeamIdentity";
import { MatchContextDisplay } from "../../../src/components/MatchContextDisplay";
import {
  buildDashboardMatchEntryById,
  getDashboardLiveSyncResult
} from "../../../src/lib/server-runtime";
import {
  getDailyMatchStateClasses,
  getDailyMatchStateLabel
} from "../../../src/lib/daily-matches-ui";
import { buildMatchResultDisplay } from "../../../src/lib/match-result-display";
import { formatPercent } from "../../../src/lib/api-client";
import {
  buildMatchesUrl,
  DAILY_MATCHES_DISPLAY_TIMEZONE,
  getLocalDateFromKickoff
} from "../../../src/lib/matches-experience";
import { getTodayDateForTimezone } from "../../../src/lib/daily-matches-ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MatchDetailPageProps {
  params: Promise<{ fixtureId: string }>;
}

export async function generateMetadata({ params }: MatchDetailPageProps): Promise<Metadata> {
  const { fixtureId } = await params;
  const syncResult = await getDashboardLiveSyncResult();
  const entry = buildDashboardMatchEntryById(syncResult, fixtureId);
  if (entry === null) {
    return { title: "Match Not Found · World Cup 2026 Predictor" };
  }
  return {
    title: `${entry.homeTeam} vs ${entry.awayTeam} · World Cup 2026 Predictor`
  };
}

function ProbabilityBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = (value * 100).toFixed(1);
  const width = Math.max(2, Math.round(value * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
          role="progressbar"
          aria-valuenow={Number(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
    </div>
  );
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { fixtureId } = await params;
  const syncResult = await getDashboardLiveSyncResult();
  const match = buildDashboardMatchEntryById(syncResult, fixtureId);

  if (match === null) {
    notFound();
  }

  const resultDisplay = buildMatchResultDisplay(match);
  const isLive = match.state === "live" || match.state === "halftime";
  const prediction = match.predictionHistory.snapshot.prediction;
  const evaluation = match.predictionHistory.evaluation;
  const snapshot = match.predictionHistory.snapshot;

  const todayDate = getTodayDateForTimezone(DAILY_MATCHES_DISPLAY_TIMEZONE);
  const matchesHref = match.kickoffAt !== undefined
    ? buildMatchesUrl(getLocalDateFromKickoff(match.kickoffAt), "all")
    : buildMatchesUrl(todayDate, "all");

  return (
    <PageContainer className="py-8">
      <div className="mb-4">
        <Link
          href={matchesHref}
          className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back to matches
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {match.group !== undefined
                ? `${match.group}${match.matchday !== undefined ? ` · Matchday ${match.matchday}` : ""}`
                : "World Cup 2026"}
            </p>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDailyMatchStateClasses(match.state)}`}
            >
              {getDailyMatchStateLabel(match.state)}
            </span>
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-950 sm:text-2xl">
            {match.homeTeam} vs {match.awayTeam}
          </h1>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex min-w-0 flex-col items-start gap-1">
              <TeamIdentity
                identity={getTeamVisualIdentity(match.homeTeam)}
                size="lg"
                showFifaCode
                className="min-w-0"
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              {resultDisplay.showPrimaryScore ? (
                <span
                  className={`rounded-lg px-4 py-2 text-2xl font-bold tabular-nums ${isLive ? "bg-red-50 text-red-900" : "bg-slate-100 text-slate-900"}`}
                >
                  {resultDisplay.primaryScoreText}
                </span>
              ) : (
                <span className="text-base font-semibold text-slate-500">
                  {match.localizedKickoff ?? "TBD"}
                </span>
              )}
              {resultDisplay.resultNote !== undefined ? (
                <span className="max-w-52 text-center text-xs font-medium text-slate-600">
                  {resultDisplay.resultNote}
                </span>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col items-end gap-1">
              <TeamIdentity
                identity={getTeamVisualIdentity(match.awayTeam)}
                size="lg"
                showFifaCode
                align="center"
                className="min-w-0"
              />
            </div>
          </div>
        </div>

        {resultDisplay.showPrimaryScore && (
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Result summary
            </h2>
            <div className="rounded-md bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {resultDisplay.primaryScoreLabel}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
                {match.homeTeam} {resultDisplay.primaryScoreText} {match.awayTeam}
              </p>
              {resultDisplay.resultNote !== undefined ? (
                <p className="mt-1 text-sm font-medium text-slate-700">{resultDisplay.resultNote}</p>
              ) : resultDisplay.winnerName !== undefined ? (
                <p className="mt-1 text-sm font-medium text-slate-700">Winner: {resultDisplay.winnerName}</p>
              ) : null}
            </div>
            {resultDisplay.detailRows.length > 0 ? (
              <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                {resultDisplay.detailRows.map((row) => (
                  <div key={row.label} className="rounded-md border border-slate-200 px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
                    <dd className="mt-1 font-medium text-slate-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        )}

        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Match information
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</dt>
              <dd className="mt-1 font-medium text-slate-900">{getDailyMatchStateLabel(match.state)}</dd>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Kickoff</dt>
              <dd className="mt-1 font-medium text-slate-900">{match.localizedKickoff ?? match.kickoffAt ?? "TBD"}</dd>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Context</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {match.group !== undefined ? `Group ${match.group}` : "World Cup 2026"}
              </dd>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Matchday</dt>
              <dd className="mt-1 font-medium text-slate-900">{match.matchday ?? "TBD"}</dd>
            </div>
            {match.venue !== undefined ? (
              <div className="rounded-md bg-slate-50 px-3 py-2 sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Venue</dt>
                <dd className="mt-1 font-medium text-slate-900">{match.venue}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {prediction !== undefined && (
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Pre-match prediction
            </h2>

            <div className="space-y-3">
              <ProbabilityBar
                label={`${match.homeTeam} win`}
                value={prediction.homeWinProbability}
                color="bg-teal-500"
              />
              <ProbabilityBar
                label="Draw"
                value={prediction.drawProbability}
                color="bg-slate-400"
              />
              <ProbabilityBar
                label={`${match.awayTeam} win`}
                value={prediction.awayWinProbability}
                color="bg-blue-500"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {prediction.projectedScoreline !== undefined && (
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Projected score</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {prediction.projectedScoreline.homeGoals} – {prediction.projectedScoreline.awayGoals}
                  </p>
                </div>
              )}
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Home xG</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                  {prediction.homeExpectedGoals.toFixed(2)}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Away xG</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                  {prediction.awayExpectedGoals.toFixed(2)}
                </p>
              </div>
              {prediction.confidenceLevel !== undefined && (
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                    {prediction.confidenceLevel}
                  </p>
                </div>
              )}
            </div>

            {prediction.coverageType !== undefined && (
              <p className="mt-2 text-xs text-slate-500">
                Coverage: <span className="font-medium capitalize text-slate-700">{prediction.coverageType}</span>
              </p>
            )}
          </div>
        )}

        {prediction === undefined && (
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {match.state === "final" ? "Prediction context" : "Prediction preview"}
            </h2>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-700">
                {match.state === "final"
                  ? "No stored pre-match prediction is available for this fixture."
                  : "Open the prediction tool to create or review model output for this matchup."}
              </p>
              {match.state !== "final" ? (
                <Link
                  href="/predictions"
                  className="mt-3 inline-flex items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  Open prediction tool
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {evaluation.available && evaluation.metrics !== undefined && (
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Model vs reality
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Outcome</p>
                <p className={`mt-1 text-sm font-semibold ${evaluation.metrics.outcomeCorrect ? "text-teal-700" : "text-rose-700"}`}>
                  {evaluation.metrics.outcomeCorrect ? "Correct" : "Incorrect"}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Exact score</p>
                <p className={`mt-1 text-sm font-semibold ${evaluation.metrics.exactScoreCorrect ? "text-teal-700" : "text-rose-700"}`}>
                  {evaluation.metrics.exactScoreCorrect ? "Correct" : "Miss"}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Brier score</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                  {evaluation.metrics.brierScore.toFixed(3)}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Log loss</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                  {evaluation.metrics.logLoss.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        )}

        {match.matchContext !== undefined && (
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Group standing context
            </h2>
            <MatchContextDisplay context={match.matchContext} />
          </div>
        )}

        <details className="group px-6 py-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Technical details
          </summary>
          <dl className="mt-3 space-y-1 text-xs text-slate-600">
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-slate-500">Fixture ID</dt>
              <dd className="min-w-0 break-all font-mono text-slate-800">{match.fixtureId}</dd>
            </div>
            {snapshot.modelVersion !== undefined && (
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-slate-500">Model version</dt>
                <dd className="min-w-0 break-all">{snapshot.modelVersion}</dd>
              </div>
            )}
            {snapshot.capturedAt !== undefined && (
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-slate-500">Captured at</dt>
                <dd className="min-w-0 break-all">{snapshot.capturedAt}</dd>
              </div>
            )}
            {snapshot.status !== undefined && (
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-slate-500">Snapshot status</dt>
                <dd>{snapshot.status}</dd>
              </div>
            )}
            {evaluation.evaluatedAt !== undefined && (
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-slate-500">Evaluated at</dt>
                <dd className="min-w-0 break-all">{evaluation.evaluatedAt}</dd>
              </div>
            )}
            {prediction !== undefined && (
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-slate-500">Sum of probs</dt>
                <dd className="tabular-nums">
                  {formatPercent(
                    prediction.homeWinProbability +
                      prediction.drawProbability +
                      prediction.awayWinProbability
                  )}
                </dd>
              </div>
            )}
            {match.predictionHistory.warnings.length > 0 && (
              <div className="mt-2">
                <dt className="text-slate-500">Warnings</dt>
                <dd>
                  <ul className="mt-1 space-y-0.5 text-amber-800">
                    {match.predictionHistory.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </details>
      </div>
    </PageContainer>
  );
}
