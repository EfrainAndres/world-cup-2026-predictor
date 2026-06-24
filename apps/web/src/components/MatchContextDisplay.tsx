import React from "react";
import type {
  WorldCup2026MatchContext,
  WorldCup2026FixtureImportanceLevel,
  WorldCup2026MatchContextQualificationStatus,
  WorldCup2026MatchContextStandingsMode
} from "../lib/api-client";

interface MatchContextDisplayProps {
  context: WorldCup2026MatchContext;
}

function importanceBadgeClasses(level: WorldCup2026FixtureImportanceLevel): string {
  switch (level) {
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "low":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "unknown":
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}

function qualificationStatusLabel(status: WorldCup2026MatchContextQualificationStatus): string {
  switch (status) {
    case "official":
      return "Official";
    case "provisional":
      return "Provisional";
    case "foundation_only":
      return "No games played";
  }
}

function standingsModeLabel(mode: WorldCup2026MatchContextStandingsMode): string {
  switch (mode) {
    case "official":
      return "Official";
    case "live_provisional":
      return "Live (provisional)";
  }
}

function standingsModeClasses(mode: WorldCup2026MatchContextStandingsMode): string {
  return mode === "live_provisional"
    ? "border-blue-200 bg-blue-50 text-blue-800"
    : "border-teal-200 bg-teal-50 text-teal-800";
}

function freshnessBadge(stale: boolean): React.ReactElement {
  return stale ? (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
      Stale
    </span>
  ) : (
    <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
      Fresh
    </span>
  );
}

function TeamContextRow({
  label,
  position,
  points,
  played,
  goalDifference
}: {
  label: string;
  position: number | null;
  points: number;
  played: number;
  goalDifference: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-slate-700">
      <span className="w-28 truncate font-medium text-slate-950">{label}</span>
      <span>Pos: {position === null ? "—" : position}</span>
      <span>Pts: {points}</span>
      <span>P: {played}</span>
      <span>GD: {goalDifference >= 0 ? `+${goalDifference}` : String(goalDifference)}</span>
    </div>
  );
}

export function MatchContextDisplay({ context }: MatchContextDisplayProps) {
  const { standingsContext, qualificationState, fixtureImportance, providerFreshness, fallbackState } = context;

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold uppercase tracking-wide text-slate-500">
          Match context
        </p>
        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
          Not used as a model input
        </span>
      </div>

      <div className="mt-2 space-y-1">
        <TeamContextRow
          label={context.homeTeam}
          position={standingsContext.home.groupPosition}
          points={standingsContext.home.points}
          played={standingsContext.home.played}
          goalDifference={standingsContext.home.goalDifference}
        />
        <TeamContextRow
          label={context.awayTeam}
          position={standingsContext.away.groupPosition}
          points={standingsContext.away.points}
          played={standingsContext.away.played}
          goalDifference={standingsContext.away.goalDifference}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${importanceBadgeClasses(fixtureImportance.level)}`}
          title={fixtureImportance.reasons.join(" ")}
        >
          {fixtureImportance.level.charAt(0).toUpperCase() + fixtureImportance.level.slice(1)} importance
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${standingsModeClasses(standingsContext.mode)}`}>
          {standingsModeLabel(standingsContext.mode)}
        </span>
        {freshnessBadge(providerFreshness.stale)}
      </div>

      {qualificationState.status !== "foundation_only" && (
        <div className="mt-2 text-xs text-slate-600">
          <span className="font-medium">Qualification ({qualificationStatusLabel(qualificationState.status)}): </span>
          {[qualificationState.firstPlace, qualificationState.secondPlace, qualificationState.thirdPlace]
            .filter((t): t is string => t !== undefined)
            .join(" · ") || "—"}
        </div>
      )}

      {fallbackState.warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-800" role="alert">
          {fallbackState.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700">
          Provenance
        </summary>
        <dl className="mt-1.5 space-y-1 text-xs text-slate-600">
          <div className="flex gap-2">
            <dt className="text-slate-500">Provider</dt>
            <dd>{providerFreshness.activeProvider}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Cache used</dt>
            <dd>{providerFreshness.cacheUsed ? "Yes" : "No"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Local fallback</dt>
            <dd>{providerFreshness.localFallbackUsed ? "Yes" : "No"}</dd>
          </div>
          {providerFreshness.lastSuccessfulSync !== undefined && (
            <div className="flex gap-2">
              <dt className="text-slate-500">Last sync</dt>
              <dd>{providerFreshness.lastSuccessfulSync}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-slate-500">Group complete</dt>
            <dd>{standingsContext.groupComplete ? "Yes" : "No"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">No-look-ahead</dt>
            <dd>Confirmed — context built from completed results only</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
