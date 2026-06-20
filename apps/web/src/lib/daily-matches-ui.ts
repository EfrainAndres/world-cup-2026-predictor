import type {
  WorldCup2026DailyMatchEntry,
  WorldCup2026DailyMatchState,
  WorldCup2026DailyMatchesProviderMetadata
} from "./api-client";
import { formatPercent } from "./api-client";

export const DAILY_MATCHES_DISPLAY_TIMEZONE = "UTC";
export type DailyMatchHistoryState =
  | "no_snapshot"
  | "upcoming_with_prediction"
  | "live_pre_match_prediction"
  | "final_evaluation_pending"
  | "final_evaluated";

function getDateParts(date: string): { year: number; month: number; day: number } {
  const [yearText, monthText, dayText] = date.split("-");
  return {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText)
  };
}

export function shiftDailyMatchesDate(date: string, offsetDays: number): string {
  const { year, month, day } = getDateParts(date);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

export function getTodayDateForTimezone(timezone: string, referenceDate = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(referenceDate);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

export function getDailyMatchStateLabel(state: WorldCup2026DailyMatchState): string {
  switch (state) {
    case "upcoming":
      return "Upcoming";
    case "live":
      return "Live";
    case "halftime":
      return "Halftime";
    case "final":
      return "Final";
    case "postponed":
      return "Postponed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}

export function getDailyMatchStateClasses(state: WorldCup2026DailyMatchState): string {
  switch (state) {
    case "live":
      return "border-red-200 bg-red-50 text-red-800";
    case "halftime":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "final":
      return "border-slate-300 bg-slate-100 text-slate-800";
    case "postponed":
    case "cancelled":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "upcoming":
      return "border-teal-200 bg-teal-50 text-teal-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function shouldShowDailyMatchScore(match: Pick<WorldCup2026DailyMatchEntry, "state" | "homeScore" | "awayScore">): boolean {
  if (match.homeScore === undefined || match.awayScore === undefined) {
    return false;
  }

  return match.state === "live" || match.state === "halftime" || match.state === "final";
}

export function getDailyMatchesSourceLabel(metadata: WorldCup2026DailyMatchesProviderMetadata): string {
  if (metadata.localFallbackUsed) {
    return "Local static fallback";
  }

  if (metadata.cacheUsed) {
    return "Cached provider data";
  }

  if (metadata.activeProvider === "football-data.org") {
    return "football-data.org";
  }

  return metadata.activeProvider;
}

export function getDailyMatchesSourceClasses(metadata: WorldCup2026DailyMatchesProviderMetadata): string {
  if (metadata.localFallbackUsed) {
    return "border-slate-300 bg-slate-100 text-slate-800";
  }

  if (metadata.cacheUsed || metadata.stale) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-teal-200 bg-teal-50 text-teal-800";
}

export function formatUtcTimestamp(timestamp: string | undefined): string {
  if (timestamp === undefined) {
    return "unavailable";
  }

  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short"
  }).format(value);
}

export function formatDailyMatchProbability(probability: number): string {
  return formatPercent(probability);
}

export function getDailyMatchScoreLabel(state: WorldCup2026DailyMatchState): string {
  if (state === "final") {
    return "Final result";
  }

  if (state === "live" || state === "halftime") {
    return "Current score";
  }

  return "Score";
}

export function getDailyMatchHistoryState(match: Pick<WorldCup2026DailyMatchEntry, "state" | "predictionHistory">): DailyMatchHistoryState {
  if (!match.predictionHistory.snapshot.available) {
    return "no_snapshot";
  }

  if (match.state === "final") {
    return match.predictionHistory.evaluation.available ? "final_evaluated" : "final_evaluation_pending";
  }

  if (match.state === "live" || match.state === "halftime") {
    return "live_pre_match_prediction";
  }

  return "upcoming_with_prediction";
}

export function getDailyMatchPredictionLabel(state: DailyMatchHistoryState): string {
  switch (state) {
    case "live_pre_match_prediction":
      return "Pre-match prediction";
    case "final_evaluation_pending":
      return "Prediction saved";
    case "final_evaluated":
      return "Pre-match prediction";
    case "upcoming_with_prediction":
      return "Pre-match prediction";
    default:
      return "No pre-match prediction saved";
  }
}

export function formatEvaluationOutcomeLabel(isCorrect: boolean): string {
  return isCorrect ? "Correct" : "Incorrect";
}

export function formatEvaluationExactScoreLabel(isCorrect: boolean): string {
  return isCorrect ? "Correct" : "Miss";
}
