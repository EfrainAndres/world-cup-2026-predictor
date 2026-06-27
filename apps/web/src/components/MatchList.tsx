import React from "react";
import type { WorldCup2026DailyMatchEntry } from "../lib/api-client";
import { CompactMatchRow } from "./CompactMatchRow";
import { EmptyState } from "./EmptyState";

interface MatchListProps {
  matches: readonly WorldCup2026DailyMatchEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function MatchList({
  matches,
  emptyTitle = "No matches found",
  emptyDescription = "Try a different date or filter."
}: MatchListProps) {
  if (matches.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ol
      className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white"
      aria-label="Matches"
    >
      {matches.map((match) => (
        <CompactMatchRow key={match.fixtureId} match={match} />
      ))}
    </ol>
  );
}
