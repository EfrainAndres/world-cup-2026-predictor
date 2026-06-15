import type {
  WorldCup2026KnockoutWinnerResolutionResponse,
  WorldCup2026ThirdPlaceMatchFoundationResponse
} from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { SectionHeader } from "./SectionHeader";

interface TournamentProjectionOverviewSectionProps {
  resolution: WorldCup2026KnockoutWinnerResolutionResponse;
  thirdPlaceMatch: WorldCup2026ThirdPlaceMatchFoundationResponse;
}

const ROUND_ANCHORS = [
  { label: "R32 Simulations", href: "#world-cup-knockout-simulation" },
  { label: "Round of 16", href: "#world-cup-round-of-16" },
  { label: "Quarterfinals", href: "#world-cup-quarterfinal" },
  { label: "Semifinals", href: "#world-cup-semifinal" },
  { label: "Final", href: "#world-cup-final" },
  { label: "Champion", href: "#world-cup-champion-projection-summary" }
] as const;

export function TournamentProjectionOverviewSection({
  resolution,
  thirdPlaceMatch
}: TournamentProjectionOverviewSectionProps) {
  const { champion, runnerUp, totalResolvedFixtures } = resolution;
  const { homeTeam: thirdHome, awayTeam: thirdAway } = thirdPlaceMatch.thirdPlaceMatchFixture;

  return (
    <section
      id="world-cup-tournament-overview"
      aria-labelledby="world-cup-tournament-overview-title"
      className="py-8"
    >
      <SectionHeader
        eyebrow="Tournament projection"
        titleId="world-cup-tournament-overview-title"
        title="Tournament Projection Overview"
        description="Full knockout tournament projection — all five rounds simulated from Round of 32 through the Final using Live Elo ratings and the Poisson model."
      />

      <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-800">Full tournament projection complete</p>
            <p className="mt-1 text-sm text-teal-700">
              {totalResolvedFixtures} knockout fixtures resolved · R32 → R16 → QF → SF → Final · Live Elo +
              Poisson model · No extra time or penalties modeled
            </p>
          </div>
          <span className="rounded border border-teal-300 bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            Deterministic
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article
          aria-label="Tournament overview champion"
          className="rounded-lg border border-teal-300 bg-teal-50 p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase text-teal-700">Projected Champion</p>
          <p className="mt-1 text-xl font-bold text-teal-950">{champion.team}</p>
          <p className="mt-1 text-xs text-slate-500">Beat {champion.opponent} in the Final</p>
          <p className="mt-2 text-xs text-slate-400">
            {formatPercent(champion.probabilitySnapshot.homeWinProbability)} /{" "}
            {formatPercent(champion.probabilitySnapshot.drawProbability)} /{" "}
            {formatPercent(champion.probabilitySnapshot.awayWinProbability)}
          </p>
        </article>

        <article
          aria-label="Tournament overview runner-up"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase text-slate-400">Projected Runner-Up</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{runnerUp.team}</p>
          <p className="mt-1 text-xs text-slate-500">Final opponent: {champion.team}</p>
        </article>

        <article
          aria-label="Tournament overview third place match"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase text-slate-400">Third Place Match</p>
          <p className="mt-1 text-xl font-bold text-slate-950">
            {thirdHome} vs {thirdAway}
          </p>
          <p className="mt-1 text-xs text-slate-500">Projected from semifinal losers</p>
        </article>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Jump to round</p>
        <nav aria-label="Tournament phase navigation" className="mt-3 flex flex-wrap gap-2">
          {ROUND_ANCHORS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-700 hover:text-teal-800"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
