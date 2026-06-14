import type { WorldCup2026RoundOf32FoundationResponse } from "../lib/api-client";

type WorldCup2026RoundOf32Fixture = WorldCup2026RoundOf32FoundationResponse["fixtures"][number];

interface WorldCupRoundOf32FixtureCardProps {
  fixture: WorldCup2026RoundOf32Fixture;
}

function formatQualificationSource(source: WorldCup2026RoundOf32Fixture["homeQualificationSource"]): string {
  if (source === "group_winner") return "Group winner";
  if (source === "group_runner_up") return "Group runner-up";

  return "Best third-place";
}

export function WorldCupRoundOf32FixtureCard({ fixture }: WorldCupRoundOf32FixtureCardProps) {
  return (
    <article aria-label={`Round of 32 fixture ${fixture.slot}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Slot {fixture.slot}</p>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
          Projected
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-950">{fixture.homeTeam}</p>
          <p className="mt-1 text-xs text-slate-500">{formatQualificationSource(fixture.homeQualificationSource)}</p>
        </div>
        <p className="text-xs font-semibold uppercase text-slate-400">vs</p>
        <div className="sm:text-right">
          <p className="text-sm font-semibold text-slate-950">{fixture.awayTeam}</p>
          <p className="mt-1 text-xs text-slate-500">{formatQualificationSource(fixture.awayQualificationSource)}</p>
        </div>
      </div>
    </article>
  );
}
