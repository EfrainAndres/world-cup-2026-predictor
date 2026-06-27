import React from "react";
import { getTeamVisualIdentity } from "@world-cup-2026-predictor/api";
import type { WorldCup2026KnockoutWinnerResolutionResponse, WorldCup2026ThirdPlaceMatchFoundationResponse } from "../lib/api-client";
import { formatPercent } from "../lib/api-client";
import { TeamIdentity } from "./TeamIdentity";

interface TournamentChampionOutlookProps {
  resolution: WorldCup2026KnockoutWinnerResolutionResponse;
  thirdPlaceMatch: WorldCup2026ThirdPlaceMatchFoundationResponse;
}

export function TournamentChampionOutlook({
  resolution,
  thirdPlaceMatch
}: TournamentChampionOutlookProps) {
  const { champion, runnerUp } = resolution;
  const { homeTeam: thirdHome, awayTeam: thirdAway } = thirdPlaceMatch.thirdPlaceMatchFixture;

  return (
    <section
      id="tournament-champion-outlook"
      aria-labelledby="tournament-champion-heading"
      className="mb-8"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="tournament-champion-heading" className="text-lg font-semibold text-slate-950">
          Champion outlook
        </h2>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          Projected only
        </span>
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Deterministic projection based on pre-match probabilities. Extra time, penalties, injuries, and lineups are not modeled.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <article
          aria-label="Projected champion"
          className="rounded-lg border border-teal-300 bg-teal-50 p-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">Projected champion</p>
          <div className="mt-2">
            <TeamIdentity
              identity={getTeamVisualIdentity(champion.team)}
              size="md"
              showFifaCode
              className="min-w-0"
            />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            def. {runnerUp.team} in the Final
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            {formatPercent(champion.probabilitySnapshot.homeWinProbability)} /{" "}
            {formatPercent(champion.probabilitySnapshot.drawProbability)} /{" "}
            {formatPercent(champion.probabilitySnapshot.awayWinProbability)}
          </p>
        </article>

        <article
          aria-label="Projected runner-up"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Projected runner-up</p>
          <div className="mt-2">
            <TeamIdentity
              identity={getTeamVisualIdentity(runnerUp.team)}
              size="md"
              showFifaCode
              className="min-w-0"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Final opponent: {champion.team}
          </p>
        </article>

        <article
          aria-label="Projected third place match"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Third place match</p>
          <div className="mt-2 flex flex-col gap-2">
            <TeamIdentity
              identity={getTeamVisualIdentity(thirdHome)}
              size="xs"
              useShortName
              className="min-w-0"
            />
            <span className="text-[10px] font-semibold uppercase text-slate-400">vs</span>
            <TeamIdentity
              identity={getTeamVisualIdentity(thirdAway)}
              size="xs"
              useShortName
              className="min-w-0"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Projected from semifinal losers</p>
        </article>
      </div>
    </section>
  );
}
