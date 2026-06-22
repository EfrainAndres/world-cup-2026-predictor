import type {
  PredictionHistoryListFilters,
  PredictionHistoryListItem,
  PredictionHistoryListQuery,
  PredictionHistoryPersistenceMetadata,
  PredictionSnapshotStatus
} from "@world-cup-2026-predictor/api";

export function formatPredictionHistoryProbability(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPredictionHistoryMetric(
  value: number | null | undefined,
  digits = 3
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return value.toFixed(digits);
}

export function formatPredictionHistoryTimestamp(
  value: string | null | undefined
): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
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
  }).format(date);
}

export function getSnapshotStatusLabel(status: PredictionSnapshotStatus): string {
  return status === "pre_match_locked"
    ? "Pre-match locked"
    : "Foundation-unverified";
}

export function getPersistenceSourceLabel(
  metadata: PredictionHistoryPersistenceMetadata | undefined
): string {
  if (metadata === undefined) {
    return "History storage unavailable";
  }

  return metadata.persistent ? "Persistent PostgreSQL history" : "In-memory history";
}

export function buildPredictionHistoryQueryString(
  current: PredictionHistoryListFilters,
  options: {
    team?: string | null;
    fixtureId?: string | null;
    group?: string | null;
    status?: PredictionSnapshotStatus | null;
    evaluationState?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  }
): string {
  const params = new URLSearchParams();
  const next = {
    ...current,
    ...options
  };

  if (next.group !== null) params.set("group", next.group);
  if (next.team !== null) params.set("team", next.team);
  if (next.fixtureId !== null) params.set("fixtureId", next.fixtureId);
  if (next.status !== null) params.set("status", next.status);
  params.set("evaluationState", next.evaluationState);
  params.set("sort", next.sort);

  if (options.pageSize !== undefined) {
    params.set("pageSize", String(options.pageSize));
  }

  if (options.page !== undefined && options.page > 1) {
    params.set("page", String(options.page));
  }

  const value = params.toString();
  return value === "" ? "/prediction-history" : `/prediction-history?${value}`;
}

export function getPredictionHistoryAccuracyLabel(
  item: PredictionHistoryListItem
): string {
  if (item.evaluation === null) {
    return "Awaiting official completed result";
  }

  return item.evaluation.outcomeCorrect ? "Outcome prediction: Correct" : "Outcome prediction: Incorrect";
}

export function toPredictionHistoryQuery(
  searchParams: Record<string, string | string[] | undefined>
): PredictionHistoryListQuery {
  function pick(key: string): string | undefined {
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  const pageText = pick("page");
  const pageSizeText = pick("pageSize");

  return {
    ...(pick("group") === undefined ? {} : { group: pick("group") }),
    ...(pick("team") === undefined ? {} : { team: pick("team") }),
    ...(pick("fixtureId") === undefined ? {} : { fixtureId: pick("fixtureId") }),
    ...(pick("status") === undefined ? {} : { status: pick("status") as PredictionSnapshotStatus }),
    ...(pick("evaluationState") === undefined
      ? {}
      : { evaluationState: pick("evaluationState") as "all" | "evaluated" | "pending" }),
    ...(pick("sort") === undefined
      ? {}
      : { sort: pick("sort") as "captured_desc" | "captured_asc" | "kickoff_desc" | "kickoff_asc" }),
    ...(pageText === undefined ? {} : { page: Number(pageText) }),
    ...(pageSizeText === undefined ? {} : { pageSize: Number(pageSizeText) })
  };
}
