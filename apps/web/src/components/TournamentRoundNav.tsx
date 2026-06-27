import React from "react";

export const TOURNAMENT_ROUNDS = [
  { label: "Champion", anchor: "#tournament-champion-outlook" },
  { label: "R32", fullLabel: "Round of 32", anchor: "#tournament-round-of-32" },
  { label: "R16", fullLabel: "Round of 16", anchor: "#tournament-round-of-16" },
  { label: "QF", fullLabel: "Quarterfinals", anchor: "#tournament-quarterfinals" },
  { label: "SF", fullLabel: "Semifinals", anchor: "#tournament-semifinals" },
  { label: "Final", anchor: "#tournament-final" },
  { label: "3rd", fullLabel: "Third Place", anchor: "#tournament-third-place" }
] as const;

interface TournamentRoundNavProps {
  className?: string;
}

export function TournamentRoundNav({ className = "" }: TournamentRoundNavProps) {
  return (
    <nav
      aria-label="Tournament round navigation"
      className={`-mx-4 sm:mx-0 ${className}`}
    >
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-1.5 px-4 pb-1 sm:px-0">
          {TOURNAMENT_ROUNDS.map(({ label, anchor, ...rest }) => {
            const fullLabel = "fullLabel" in rest ? rest.fullLabel : label;
            return (
              <a
                key={anchor}
                href={anchor}
                aria-label={fullLabel}
                title={fullLabel}
                className="flex min-h-[36px] shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
              >
                {label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
