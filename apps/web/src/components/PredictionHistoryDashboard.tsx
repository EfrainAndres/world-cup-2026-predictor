import React from "react";
import Link from "next/link";
import type {
  PredictionHistoryListFilters,
  PredictionHistoryListResponse,
  PredictionHistoryListSuccessResponse,
  PredictionHistoryPersistenceMetadata,
  PredictionSnapshotStatus
} from "@world-cup-2026-predictor/api";
import {
  buildPredictionHistoryQueryString,
  formatPredictionHistoryMetric,
  formatPredictionHistoryProbability,
  formatPredictionHistoryTimestamp,
  getPersistenceSourceLabel,
  getPredictionHistoryAccuracyLabel,
  getSnapshotStatusLabel
} from "../lib/prediction-history-ui";

interface PredictionHistoryDashboardProps {
  response: PredictionHistoryListResponse;
  formValues: {
    group: string;
    team: string;
    fixtureId: string;
    status: string;
    evaluationState: string;
    sort: string;
    pageSize: string;
  };
}

function renderSummaryCard(label: string, value: string, detail: string) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function FiltersForm({ values }: { values: PredictionHistoryDashboardProps["formValues"] }) {
  return (
    <form action="/prediction-history" method="GET" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <fieldset className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <legend className="sr-only">Prediction history filters</legend>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Group</span>
          <select name="group" defaultValue={values.group} className="rounded-md border border-slate-300 px-3 py-2">
            <option value="">All groups</option>
            {"ABCDEFGHIJKL".split("").map((group) => (
              <option key={group} value={group}>
                Group {group}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Team</span>
          <input
            name="team"
            defaultValue={values.team}
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="Mexico"
            type="text"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Fixture ID</span>
          <input
            name="fixtureId"
            defaultValue={values.fixtureId}
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="wc2026-group-a-md1-01-..."
            type="text"
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Snapshot status</span>
          <select name="status" defaultValue={values.status} className="rounded-md border border-slate-300 px-3 py-2">
            <option value="">All statuses</option>
            <option value="pre_match_locked">Pre-match locked</option>
            <option value="foundation_unverified">Foundation-unverified</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Evaluation state</span>
          <select name="evaluationState" defaultValue={values.evaluationState} className="rounded-md border border-slate-300 px-3 py-2">
            <option value="all">All</option>
            <option value="evaluated">Evaluated</option>
            <option value="pending">Pending</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Sort order</span>
          <select name="sort" defaultValue={values.sort} className="rounded-md border border-slate-300 px-3 py-2">
            <option value="captured_desc">Captured date, newest first</option>
            <option value="captured_asc">Captured date, oldest first</option>
            <option value="kickoff_desc">Kickoff date, newest first</option>
            <option value="kickoff_asc">Kickoff date, oldest first</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          <span className="font-medium">Page size</span>
          <select name="pageSize" defaultValue={values.pageSize} className="rounded-md border border-slate-300 px-3 py-2">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-md border border-teal-700 bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          Apply filters
        </button>
        <Link
          href="/prediction-history"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Clear filters
        </Link>
      </div>
    </form>
  );
}

function HistoryStatusBadge({ status }: { status: PredictionSnapshotStatus }) {
  const classes =
    status === "pre_match_locked"
      ? "border-teal-200 bg-teal-50 text-teal-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}>
      {getSnapshotStatusLabel(status)}
    </span>
  );
}

function PredictionHistoryDesktopTable({
  items
}: {
  items: PredictionHistoryListSuccessResponse["items"];
}) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="min-w-full border-collapse text-sm">
        <caption className="sr-only">Prediction history table</caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Fixture</th>
            <th className="px-4 py-3">Prediction</th>
            <th className="px-4 py-3">Reality</th>
            <th className="px-4 py-3">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.snapshotId} className="border-b border-slate-100 align-top">
              <td className="px-4 py-4">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-950">
                    {item.homeTeam} <span className="text-slate-400">vs</span> {item.awayTeam}
                  </p>
                  <p className="text-slate-600">
                    Group {item.group} · Matchday {item.matchday}
                  </p>
                  <p className="text-slate-600">Fixture ID: {item.fixtureId}</p>
                  <p className="text-slate-600">Kickoff: {formatPredictionHistoryTimestamp(item.kickoffAt)}</p>
                  <p className="text-slate-600">Captured: {formatPredictionHistoryTimestamp(item.capturedAt)}</p>
                  <HistoryStatusBadge status={item.snapshotStatus} />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1">
                  <p className="font-medium text-slate-950">
                    Projected score: {item.projectedScore.home} - {item.projectedScore.away}
                  </p>
                  <p className="text-slate-700">
                    xG: {item.expectedGoals.home.toFixed(2)} - {item.expectedGoals.away.toFixed(2)}
                  </p>
                  <p className="text-slate-700">
                    1X2: {formatPredictionHistoryProbability(item.outcomeProbabilities.homeWin)} /{" "}
                    {formatPredictionHistoryProbability(item.outcomeProbabilities.draw)} /{" "}
                    {formatPredictionHistoryProbability(item.outcomeProbabilities.awayWin)}
                  </p>
                  <p className="text-slate-700">
                    Confidence: {item.confidence.level} · Coverage: {item.confidence.coverage}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4">
                {item.evaluation === null ? (
                  <p className="text-slate-600">Awaiting official completed result</p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-950">
                      Actual score: {item.evaluation.actualScore.home} - {item.evaluation.actualScore.away}
                    </p>
                    <p className="text-slate-700">Actual outcome: {item.evaluation.actualOutcome}</p>
                    <p className="text-slate-700">
                      Evaluated: {formatPredictionHistoryTimestamp(item.evaluation.evaluatedAt)}
                    </p>
                  </div>
                )}
              </td>
              <td className="px-4 py-4">
                {item.evaluation === null ? (
                  <p className="text-slate-600">Awaiting official completed result</p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-950">{getPredictionHistoryAccuracyLabel(item)}</p>
                    <p className="text-slate-700">
                      Exact scoreline: {item.evaluation.scorelineCorrect ? "Correct" : "Miss"}
                    </p>
                    <p className="text-slate-700">Brier Score: {formatPredictionHistoryMetric(item.evaluation.brierScore)}</p>
                    <p className="text-slate-700">Log Loss: {formatPredictionHistoryMetric(item.evaluation.logLoss)}</p>
                    <p className="text-slate-700">
                      Home goal error: {formatPredictionHistoryMetric(item.evaluation.homeGoalAbsoluteError, 2)}
                    </p>
                    <p className="text-slate-700">
                      Away goal error: {formatPredictionHistoryMetric(item.evaluation.awayGoalAbsoluteError, 2)}
                    </p>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PredictionHistoryMobileCards({
  items
}: {
  items: PredictionHistoryListSuccessResponse["items"];
}) {
  return (
    <div className="grid gap-4 lg:hidden">
      {items.map((item) => (
        <article key={item.snapshotId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Group {item.group} · Matchday {item.matchday}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                {item.homeTeam} <span className="text-slate-400">vs</span> {item.awayTeam}
              </h2>
            </div>
            <HistoryStatusBadge status={item.snapshotStatus} />
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prediction</p>
              <p className="mt-2 text-sm text-slate-700">
                Projected score: {item.projectedScore.home} - {item.projectedScore.away}
              </p>
              <p className="text-sm text-slate-700">
                xG: {item.expectedGoals.home.toFixed(2)} - {item.expectedGoals.away.toFixed(2)}
              </p>
              <p className="text-sm text-slate-700">
                1X2: {formatPredictionHistoryProbability(item.outcomeProbabilities.homeWin)} /{" "}
                {formatPredictionHistoryProbability(item.outcomeProbabilities.draw)} /{" "}
                {formatPredictionHistoryProbability(item.outcomeProbabilities.awayWin)}
              </p>
              <p className="text-sm text-slate-700">
                Confidence: {item.confidence.level} · Coverage: {item.confidence.coverage}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reality</p>
              {item.evaluation === null ? (
                <p className="mt-2 text-sm text-slate-600">Awaiting official completed result</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-700">
                    Actual score: {item.evaluation.actualScore.home} - {item.evaluation.actualScore.away}
                  </p>
                  <p className="text-sm text-slate-700">Actual outcome: {item.evaluation.actualOutcome}</p>
                </>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accuracy</p>
              {item.evaluation === null ? (
                <p className="mt-2 text-sm text-slate-600">Awaiting official completed result</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-700">{getPredictionHistoryAccuracyLabel(item)}</p>
                  <p className="text-sm text-slate-700">
                    Exact scoreline: {item.evaluation.scorelineCorrect ? "Correct" : "Miss"}
                  </p>
                  <p className="text-sm text-slate-700">
                    Brier Score: {formatPredictionHistoryMetric(item.evaluation.brierScore)}
                  </p>
                </>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Pagination({
  filters,
  page,
  totalPages,
  pageSize,
  hasPreviousPage,
  hasNextPage
}: {
  filters: PredictionHistoryListFilters;
  page: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Prediction history pagination" className="mt-6 flex flex-wrap items-center gap-3">
      <Link
        href={buildPredictionHistoryQueryString(filters, {
          page: Math.max(1, page - 1),
          pageSize
        })}
        aria-disabled={!hasPreviousPage}
        className={`rounded-md border px-4 py-2 text-sm font-medium ${
          hasPreviousPage
            ? "border-slate-300 text-slate-700"
            : "border-slate-200 text-slate-400 pointer-events-none"
        }`}
      >
        Previous page
      </Link>
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </p>
      <Link
        href={buildPredictionHistoryQueryString(filters, {
          page: Math.min(totalPages, page + 1),
          pageSize
        })}
        aria-disabled={!hasNextPage}
        className={`rounded-md border px-4 py-2 text-sm font-medium ${
          hasNextPage
            ? "border-slate-300 text-slate-700"
            : "border-slate-200 text-slate-400 pointer-events-none"
        }`}
      >
        Next page
      </Link>
    </nav>
  );
}

export function PredictionHistoryDashboard({
  response,
  formValues
}: PredictionHistoryDashboardProps) {
  const persistenceMetadata =
    "persistenceMetadata" in response
      ? (response.persistenceMetadata as PredictionHistoryPersistenceMetadata | undefined)
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/" className="font-medium text-teal-700 hover:underline">
            ← Dashboard
          </Link>
        </div>

        <section aria-labelledby="prediction-history-heading" className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Prediction history</p>
          <h1 id="prediction-history-heading" className="mt-1 text-3xl font-semibold text-slate-950 sm:text-4xl">
            Prediction History Dashboard
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Review immutable pre-match predictions alongside official results and Model-vs-Reality accuracy metrics. This page never regenerates, edits, or deletes stored history.
          </p>
        </section>

        <section aria-labelledby="prediction-history-source" className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 id="prediction-history-source" className="text-sm font-semibold text-slate-950">
            History source
          </h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 font-medium">
              Source: {getPersistenceSourceLabel(persistenceMetadata)}
            </span>
            {persistenceMetadata !== undefined ? (
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium">
                Provider: {persistenceMetadata.provider}
              </span>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="prediction-history-filters" className="mb-8">
          <h2 id="prediction-history-filters" className="mb-3 text-lg font-semibold text-slate-950">
            Filters
          </h2>
          <FiltersForm values={formValues} />
        </section>

        {response.status === "validation_error" ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" role="alert">
            <p className="font-semibold text-amber-950">Some filters are invalid.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {response.issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  {issue.field}: {issue.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {response.status === "error" ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900" role="alert">
            <p className="font-semibold text-rose-950">Prediction history is unavailable.</p>
            <p className="mt-2">{response.error.message}</p>
          </section>
        ) : null}

        {response.status === "success" ? (
          <>
            <section aria-labelledby="prediction-history-summary" className="mb-8">
              <h2 id="prediction-history-summary" className="mb-3 text-lg font-semibold text-slate-950">
                Filter-scoped summary
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {renderSummaryCard("Total snapshots", String(response.summary.totalSnapshots), "Current filtered result set")}
                {renderSummaryCard("Evaluated", String(response.summary.evaluatedSnapshots), "Joined to official completed results")}
                {renderSummaryCard("Pending", String(response.summary.pendingSnapshots), "Awaiting evaluation")}
                {renderSummaryCard(
                  "Outcome accuracy",
                  response.summary.outcomeAccuracy === null
                    ? "Unavailable"
                    : formatPredictionHistoryProbability(response.summary.outcomeAccuracy),
                  "Evaluated snapshots only"
                )}
                {renderSummaryCard(
                  "Exact scoreline accuracy",
                  response.summary.exactScoreAccuracy === null
                    ? "Unavailable"
                    : formatPredictionHistoryProbability(response.summary.exactScoreAccuracy),
                  "Evaluated snapshots only"
                )}
                {renderSummaryCard(
                  "Average Brier Score",
                  formatPredictionHistoryMetric(response.summary.averageBrierScore),
                  "Evaluated snapshots only"
                )}
              </div>
            </section>

            <section aria-labelledby="prediction-history-results" className="mb-8">
              <h2 id="prediction-history-results" className="mb-3 text-lg font-semibold text-slate-950">
                History records
              </h2>
              {response.items.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  No prediction history records match the current filters.
                </div>
              ) : (
                <>
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Showing {response.items.length} of {response.pagination.totalItems} matching snapshot record(s).
                  </div>
                  <PredictionHistoryDesktopTable items={response.items} />
                  <PredictionHistoryMobileCards items={response.items} />
                  <Pagination
                    filters={response.filters}
                    page={response.pagination.page}
                    pageSize={response.pagination.pageSize}
                    totalPages={response.pagination.totalPages}
                    hasPreviousPage={response.pagination.hasPreviousPage}
                    hasNextPage={response.pagination.hasNextPage}
                  />
                </>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
