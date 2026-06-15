import type { WorldCup2026KnockoutWinnerResolutionResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

interface WorldCupChampionProjectionSummarySectionProps {
  resolution: WorldCup2026KnockoutWinnerResolutionResponse;
}

interface PathEntry {
  label: string;
  opponent: string;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
}

export function WorldCupChampionProjectionSummarySection({ resolution }: WorldCupChampionProjectionSummarySectionProps) {
  const { champion, runnerUp } = resolution;

  const r32Entry = resolution.roundOf32Winners.find((w) => w.team === champion.team);
  const r16Entry = resolution.roundOf16Winners.find((w) => w.team === champion.team);
  const qfEntry = resolution.quarterfinalWinners.find((w) => w.team === champion.team);
  const sfEntry = resolution.semifinalWinners.find((w) => w.team === champion.team);

  const pathEntries: PathEntry[] = [
    r32Entry
      ? {
          label: "Round of 32",
          opponent: r32Entry.opponent,
          homeWinProbability: r32Entry.probabilitySnapshot.homeWinProbability,
          drawProbability: r32Entry.probabilitySnapshot.drawProbability,
          awayWinProbability: r32Entry.probabilitySnapshot.awayWinProbability
        }
      : null,
    r16Entry
      ? {
          label: "Round of 16",
          opponent: r16Entry.opponent,
          homeWinProbability: r16Entry.probabilitySnapshot.homeWinProbability,
          drawProbability: r16Entry.probabilitySnapshot.drawProbability,
          awayWinProbability: r16Entry.probabilitySnapshot.awayWinProbability
        }
      : null,
    qfEntry
      ? {
          label: "Quarterfinal",
          opponent: qfEntry.opponent,
          homeWinProbability: qfEntry.probabilitySnapshot.homeWinProbability,
          drawProbability: qfEntry.probabilitySnapshot.drawProbability,
          awayWinProbability: qfEntry.probabilitySnapshot.awayWinProbability
        }
      : null,
    sfEntry
      ? {
          label: "Semifinal",
          opponent: sfEntry.opponent,
          homeWinProbability: sfEntry.probabilitySnapshot.homeWinProbability,
          drawProbability: sfEntry.probabilitySnapshot.drawProbability,
          awayWinProbability: sfEntry.probabilitySnapshot.awayWinProbability
        }
      : null,
    {
      label: "Final",
      opponent: champion.opponent,
      homeWinProbability: champion.probabilitySnapshot.homeWinProbability,
      drawProbability: champion.probabilitySnapshot.drawProbability,
      awayWinProbability: champion.probabilitySnapshot.awayWinProbability
    }
  ].filter((e): e is PathEntry => e !== null);

  return (
    <section
      id="world-cup-champion-projection-summary"
      aria-labelledby="world-cup-champion-projection-summary-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Champion projection"
        titleId="world-cup-champion-projection-summary-title"
        title="Champion Projection Summary"
        description="Deterministic projected champion and tournament path derived from all simulated knockout match probabilities."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Deterministic projection only</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          Champion projection is deterministic and based on pre-match probabilities only. Extra time, penalties, live
          injuries, lineups, and real-time results are not modeled.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article
          aria-label="Projected Champion"
          className="rounded-lg border border-teal-300 bg-teal-50 p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase text-teal-700">Projected Champion</p>
          <p className="mt-1 text-2xl font-bold text-teal-950">{champion.team}</p>
          <p className="mt-1 text-xs text-slate-500">{champion.advancementReason}</p>
          <p className="mt-1 text-xs text-slate-400">vs {champion.opponent} (Final)</p>
          <p className="mt-1 text-xs text-slate-400">
            {formatPercent(champion.probabilitySnapshot.homeWinProbability)} /{" "}
            {formatPercent(champion.probabilitySnapshot.drawProbability)} /{" "}
            {formatPercent(champion.probabilitySnapshot.awayWinProbability)}
          </p>
        </article>

        <article
          aria-label="Projected Runner-Up"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase text-slate-400">Projected Runner-Up</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{runnerUp.team}</p>
          <p className="mt-1 text-xs text-slate-500">{runnerUp.advancementReason}</p>
          <p className="mt-1 text-xs text-slate-400">vs {runnerUp.opponent} (Final)</p>
        </article>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Champion path</p>
        <p className="mt-1 text-xs text-slate-400">{champion.team} projected path to the title</p>
        <ol className="mt-3 divide-y divide-slate-100">
          {pathEntries.map(({ label, opponent, homeWinProbability, drawProbability, awayWinProbability }) => (
            <li key={label} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="w-28 shrink-0 text-xs font-semibold uppercase text-slate-500">{label}</span>
              <span className="flex-1 text-slate-950">def. {opponent}</span>
              <span className="text-xs text-slate-400">
                {formatPercent(homeWinProbability)} / {formatPercent(drawProbability)} /{" "}
                {formatPercent(awayWinProbability)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
