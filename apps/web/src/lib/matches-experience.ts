import type { WorldCup2026DailyMatchEntry, WorldCup2026DailyMatchState } from "./api-client";
import { shiftDailyMatchesDate, DAILY_MATCHES_DISPLAY_TIMEZONE } from "./daily-matches-ui";

export { DAILY_MATCHES_DISPLAY_TIMEZONE };

export type MatchFilter = "all" | "live" | "upcoming" | "finished" | "predicted";

export const MATCH_FILTERS: readonly MatchFilter[] = [
  "all",
  "live",
  "upcoming",
  "finished",
  "predicted"
];

export const MATCH_FILTER_LABELS: Record<MatchFilter, string> = {
  all: "All",
  live: "Live",
  upcoming: "Upcoming",
  finished: "Finished",
  predicted: "Predicted"
};

type StatusBadgeVariant = "neutral" | "info" | "success" | "warning" | "danger" | "live";

export function getMatchStatusVariant(state: WorldCup2026DailyMatchState): StatusBadgeVariant {
  switch (state) {
    case "live":
    case "halftime":
      return "live";
    case "upcoming":
      return "info";
    case "final":
      return "success";
    case "postponed":
    case "cancelled":
      return "warning";
    default:
      return "neutral";
  }
}

export function getMatchStatusPriority(state: WorldCup2026DailyMatchState): number {
  switch (state) {
    case "live":
    case "halftime":
      return 0;
    case "upcoming":
      return 1;
    case "final":
      return 2;
    case "postponed":
      return 3;
    case "cancelled":
      return 4;
    default:
      return 5;
  }
}

function kickoffMs(entry: WorldCup2026DailyMatchEntry): number {
  if (entry.kickoffAt === undefined) return 0;
  const t = Date.parse(entry.kickoffAt);
  return Number.isNaN(t) ? 0 : t;
}

export function sortMatchesForDisplay(
  matches: readonly WorldCup2026DailyMatchEntry[]
): WorldCup2026DailyMatchEntry[] {
  return [...matches].sort((a, b) => {
    const priorityDiff = getMatchStatusPriority(a.state) - getMatchStatusPriority(b.state);
    if (priorityDiff !== 0) return priorityDiff;

    if (a.state === "final" && b.state === "final") {
      return kickoffMs(b) - kickoffMs(a);
    }

    const aMs = kickoffMs(a) || Number.MAX_SAFE_INTEGER;
    const bMs = kickoffMs(b) || Number.MAX_SAFE_INTEGER;
    return aMs - bMs;
  });
}

export function applyMatchFilter(
  matches: readonly WorldCup2026DailyMatchEntry[],
  filter: MatchFilter
): WorldCup2026DailyMatchEntry[] {
  switch (filter) {
    case "live":
      return matches.filter((m) => m.state === "live" || m.state === "halftime");
    case "upcoming":
      return matches.filter((m) => m.state === "upcoming");
    case "finished":
      return matches.filter((m) => m.state === "final");
    case "predicted":
      return matches.filter((m) => m.predictionHistory.snapshot.available);
    default:
      return [...matches];
  }
}

export function parseMatchFilter(value: string | undefined): MatchFilter {
  if (value === undefined) return "all";
  const lower = value.toLowerCase();
  if ((MATCH_FILTERS as readonly string[]).includes(lower)) return lower as MatchFilter;
  return "all";
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseMatchDate(value: string | undefined, fallbackDate: string): string {
  if (value === undefined) return fallbackDate;
  if (!DATE_REGEX.test(value)) return fallbackDate;
  const parts = value.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const candidate = new Date(Date.UTC(y, m - 1, d));
  if (
    candidate.getUTCFullYear() !== y ||
    candidate.getUTCMonth() !== m - 1 ||
    candidate.getUTCDate() !== d
  ) {
    return fallbackDate;
  }
  return value;
}

export function buildMatchesUrl(date: string, filter: MatchFilter = "all"): string {
  const params = new URLSearchParams({ date });
  if (filter !== "all") params.set("filter", filter);
  return `/matches?${params.toString()}`;
}

export function getPrevDate(date: string): string {
  return shiftDailyMatchesDate(date, -1);
}

export function getNextDate(date: string): string {
  return shiftDailyMatchesDate(date, 1);
}

export function formatDisplayDate(date: string): string {
  const parts = date.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return date;
  const value = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(value);
}
