import type { WorldCup2026KnockoutWinnerResolutionResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

type ResolvedWinner = WorldCup2026KnockoutWinnerResolutionResponse["roundOf32Winners"][number];

interface WorldCupKnockoutWinnerResolutionSectionProps {
  resolution: WorldCup2026KnockoutWinnerResolutionResponse;
}

interface ChampionCardProps {
  winner: ResolvedWinner;
  label: "Projected Champion" | "Projected Runner-Up";
}

function ChampionCard({ winner, label }: ChampionCardProps) {
  const isChampion = label === "Projected Champion";

  return (
    <article
      aria-label={label}
      className={`rounded-lg border p-5 shadow-sm ${isChampion ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"}`}
    >
      <p className={`text-xs font-semibold uppercase ${isChampion ? "text-teal-700" : "text-slate-400"}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${isChampion ? "text-teal-950" : "text-slate-950"}`}>{winner.team}</p>
      <p className="mt-1 text-xs text-slate-500">{winner.advancementReason}</p>
      <p className="mt-1 text-xs text-slate-400">vs {winner.opponent}</p>
      <p className="mt-1 text-xs text-slate-400">
        {formatPercent(winner.probabilitySnapshot.homeWinProbability)} / {formatPercent(winner.probabilitySnapshot.drawProbability)} / {formatPercent(winner.probabilitySnapshot.awayWinProbability)}
      </p>
    </article>
  );
}

interface RoundWinnersListProps {
  label: string;
  winners: readonly ResolvedWinner[];
}

function RoundWinnersList({ label, winners }: RoundWinnersListProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <ul className="mt-2 space-y-1">
        {winners.map((winner) => (
          <li key={winner.sourceFixtureId} className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-950">{winner.team}</span>
            <span className="text-xs text-slate-400">def. {winner.opponent}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WorldCupKnockoutWinnerResolutionSection({ resolution }: WorldCupKnockoutWinnerResolutionSectionProps) {
  return (
    <section
      id="world-cup-knockout-winner-resolution"
      aria-labelledby="world-cup-knockout-winner-resolution-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Knockout winner resolution"
        titleId="world-cup-knockout-winner-resolution-title"
        title="Projected Tournament Winner"
        description="Deterministic knockout winners resolved from all simulated match probabilities. No extra time, penalties, or randomization."
      />

      <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Deterministic projection only</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">
          Champion is selected by deterministic pre-match probabilities only. Extra time, penalties, and live results are not modeled.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ChampionCard winner={resolution.champion} label="Projected Champion" />
        <ChampionCard winner={resolution.runnerUp} label="Projected Runner-Up" />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <RoundWinnersList label="Round of 32" winners={resolution.roundOf32Winners} />
        <RoundWinnersList label="Round of 16" winners={resolution.roundOf16Winners} />
        <RoundWinnersList label="Quarterfinals" winners={resolution.quarterfinalWinners} />
        <RoundWinnersList label="Semifinals" winners={resolution.semifinalWinners} />
      </div>
    </section>
  );
}
