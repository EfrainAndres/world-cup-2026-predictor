import React from "react";
import type {
  WorldCup2026GroupProjection,
  WorldCup2026GroupProjectionFixture,
  WorldCup2026GroupProjectionSource
} from "../lib/api-client";
import { GroupDetailStandingsTable } from "./GroupDetailStandingsTable";

interface GroupDetailProjectionProps {
  projection: WorldCup2026GroupProjection;
}

function sourceLabel(source: WorldCup2026GroupProjectionSource): string {
  switch (source) {
    case "stored_snapshot":
      return "Stored prediction";
    case "auto_predict":
      return "Auto Predict";
    case "unavailable":
      return "Unavailable";
  }
}

function sourceClasses(source: WorldCup2026GroupProjectionSource): string {
  switch (source) {
    case "stored_snapshot":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "auto_predict":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "unavailable":
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function formatProbability(value: number | undefined): string {
  if (value === undefined) return "–";
  return `${(value * 100).toFixed(0)}%`;
}

function ProjectionFixtureRow({ fixture }: { fixture: WorldCup2026GroupProjectionFixture }) {
  const hasScore = fixture.projectedScoreline !== undefined;
  return (
    <li className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">
          {fixture.homeTeam} <span className="text-slate-400">vs</span> {fixture.awayTeam}
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sourceClasses(fixture.source)}`}
          aria-label={`Projection source: ${sourceLabel(fixture.source)}`}
        >
          {sourceLabel(fixture.source)}
        </span>
      </div>

      {hasScore && (
        <p className="mt-1 text-xs text-slate-600" aria-label="Projected scoreline">
          Projected:{" "}
          <span className="font-semibold text-slate-900">
            {fixture.projectedScoreline!.homeGoals}–{fixture.projectedScoreline!.awayGoals}
          </span>
        </p>
      )}

      {(fixture.homeWinProbability !== undefined ||
        fixture.drawProbability !== undefined ||
        fixture.awayWinProbability !== undefined) && (
        <p className="mt-0.5 text-xs text-slate-500">
          H {formatProbability(fixture.homeWinProbability)} · D{" "}
          {formatProbability(fixture.drawProbability)} · A{" "}
          {formatProbability(fixture.awayWinProbability)}
        </p>
      )}

      {fixture.confidenceLevel !== undefined && (
        <p className="mt-0.5 text-xs text-slate-400">
          Confidence:{" "}
          <span className="font-medium">{fixture.confidenceLevel}</span>
          {fixture.coverageType !== undefined && (
            <> · {fixture.coverageType}</>
          )}
        </p>
      )}

      {fixture.warnings.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {fixture.warnings.map((w, i) => (
            <li key={i} className="text-xs text-amber-700">
              {w}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function GroupDetailProjection({ projection }: GroupDetailProjectionProps) {
  if (!projection.available) {
    return (
      <section aria-labelledby="projection-heading">
        <h2 id="projection-heading" className="mb-3 text-lg font-semibold text-slate-950">
          Projected standings
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Projected standings are not available for this group.
          </p>
          {projection.warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {projection.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700">
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  const statusBadge =
    projection.status === "complete"
      ? { label: "Complete projection", classes: "border-teal-200 bg-teal-50 text-teal-800" }
      : projection.status === "partial"
      ? { label: "Partial projection", classes: "border-amber-200 bg-amber-50 text-amber-800" }
      : { label: "Unavailable", classes: "border-slate-200 bg-slate-100 text-slate-600" };

  return (
    <section aria-labelledby="projection-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="projection-heading" className="text-lg font-semibold text-slate-950">
          Projected standings
        </h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.classes}`}>
          {statusBadge.label}
        </span>
      </div>

      {projection.standings !== undefined && projection.standings.length > 0 && (
        <div className="mb-4">
          <GroupDetailStandingsTable standings={projection.standings} label="Projected standings" />
        </div>
      )}

      {projection.qualification !== undefined && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-950">Projected qualification</p>
          <dl className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">Projected 1st</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-950">
                {projection.qualification.projectedFirstPlace ?? "Undetermined"}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">Projected 2nd</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-950">
                {projection.qualification.projectedSecondPlace ?? "Undetermined"}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-semibold uppercase text-slate-500">Projected 3rd</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-950">
                {projection.qualification.projectedThirdPlace ?? "Undetermined"}
              </dd>
              {projection.qualification.projectedThirdPlaceQualifying !== undefined && (
                <dd className="mt-0.5 text-xs text-slate-600">
                  {projection.qualification.projectedThirdPlaceQualifying
                    ? "Projected to qualify as best third"
                    : "Not projected to qualify as best third"}
                </dd>
              )}
            </div>
          </dl>
        </div>
      )}

      {projection.fixtures.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Per-fixture projections
          </p>
          <ul className="space-y-2">
            {projection.fixtures.map((f) => (
              <ProjectionFixtureRow key={f.fixtureId} fixture={f} />
            ))}
          </ul>
        </div>
      )}

      {projection.warnings.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-amber-800">Projection notes</p>
          <ul className="space-y-0.5">
            {projection.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
