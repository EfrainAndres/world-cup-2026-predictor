import type { WorldCup2026DailyMatchEntry } from "./api-client";

type MatchResultDisplayInput = Pick<
  WorldCup2026DailyMatchEntry,
  | "homeTeam"
  | "awayTeam"
  | "state"
  | "homeScore"
  | "awayScore"
  | "regularTimeHomeScore"
  | "regularTimeAwayScore"
  | "extraTimeHomeScore"
  | "extraTimeAwayScore"
  | "penaltyHomeScore"
  | "penaltyAwayScore"
  | "winner"
  | "decisionMethod"
  | "predictionHistory"
>;

export interface MatchResultDetailRow {
  label: string;
  value: string;
}

export interface MatchResultDisplay {
  showPrimaryScore: boolean;
  primaryScoreText: string;
  primaryScoreLabel: string;
  resultNote?: string;
  winnerName?: string;
  hasPenaltyShootout: boolean;
  detailRows: MatchResultDetailRow[];
}

function getScorePair(
  homeScore: number | undefined,
  awayScore: number | undefined
): { home: number; away: number } | null {
  return homeScore === undefined || awayScore === undefined ? null : { home: homeScore, away: awayScore };
}

export function formatMatchScore(homeScore: number, awayScore: number): string {
  return `${homeScore} – ${awayScore}`;
}

function formatCompactMatchScore(homeScore: number, awayScore: number): string {
  return `${homeScore}–${awayScore}`;
}

function shouldShowPrimaryScore(match: MatchResultDisplayInput): boolean {
  return getScorePair(match.homeScore, match.awayScore) !== null && (
    match.state === "live" ||
    match.state === "halftime" ||
    match.state === "final"
  );
}

function getPrimaryScoreLabel(match: MatchResultDisplayInput): string {
  if (match.state === "live" || match.state === "halftime") {
    return "Current score";
  }

  if (match.state !== "final") {
    return match.predictionHistory.snapshot.available ? "Prediction available" : "Preview";
  }

  if (match.decisionMethod === "extra_time" || match.decisionMethod === "penalties") {
    return match.extraTimeHomeScore !== undefined && match.extraTimeAwayScore !== undefined
      ? "After extra time"
      : "Final";
  }

  return "Final";
}

function resolvePenaltyWinner(match: MatchResultDisplayInput): string | undefined {
  if (match.winner !== undefined) return match.winner;
  if (match.penaltyHomeScore === undefined || match.penaltyAwayScore === undefined) return undefined;
  if (match.penaltyHomeScore > match.penaltyAwayScore) return match.homeTeam;
  if (match.penaltyAwayScore > match.penaltyHomeScore) return match.awayTeam;
  return undefined;
}

function buildPenaltyNote(match: MatchResultDisplayInput, winnerName: string | undefined): string | undefined {
  if (winnerName === undefined || match.penaltyHomeScore === undefined || match.penaltyAwayScore === undefined) {
    return undefined;
  }

  const winnerPenaltyScore = winnerName === match.homeTeam ? match.penaltyHomeScore : match.penaltyAwayScore;
  const loserPenaltyScore = winnerName === match.homeTeam ? match.penaltyAwayScore : match.penaltyHomeScore;
  return `${winnerName} wins ${formatCompactMatchScore(winnerPenaltyScore, loserPenaltyScore)} on penalties`;
}

export function buildMatchResultDisplay(match: MatchResultDisplayInput): MatchResultDisplay {
  const showPrimaryScore = shouldShowPrimaryScore(match);
  const primaryScore = getScorePair(match.homeScore, match.awayScore);
  const regularTimeScore = getScorePair(match.regularTimeHomeScore, match.regularTimeAwayScore);
  const extraTimeScore = getScorePair(match.extraTimeHomeScore, match.extraTimeAwayScore);
  const penaltyScore = getScorePair(match.penaltyHomeScore, match.penaltyAwayScore);
  const hasPenaltyShootout = penaltyScore !== null;
  const winnerName = hasPenaltyShootout ? resolvePenaltyWinner(match) : match.winner;
  const penaltyNote = buildPenaltyNote(match, winnerName);
  const detailRows: MatchResultDetailRow[] = [];

  if (regularTimeScore !== null) {
    detailRows.push({
      label: "Regular time",
      value: formatMatchScore(regularTimeScore.home, regularTimeScore.away)
    });
  }

  if (extraTimeScore !== null) {
    detailRows.push({
      label: "After extra time",
      value: formatMatchScore(extraTimeScore.home, extraTimeScore.away)
    });
  }

  if (penaltyScore !== null) {
    detailRows.push({
      label: "Penalties",
      value: `${match.homeTeam} ${formatCompactMatchScore(penaltyScore.home, penaltyScore.away)} ${match.awayTeam}`
    });
  }

  return {
    showPrimaryScore,
    primaryScoreText: showPrimaryScore && primaryScore !== null
      ? formatMatchScore(primaryScore.home, primaryScore.away)
      : "vs",
    primaryScoreLabel: getPrimaryScoreLabel(match),
    hasPenaltyShootout,
    detailRows,
    ...(winnerName === undefined ? {} : { winnerName }),
    ...(penaltyNote === undefined ? {} : { resultNote: penaltyNote })
  };
}
