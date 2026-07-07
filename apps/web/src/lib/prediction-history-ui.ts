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

// Wording mirrors the canonical status rules documented in
// docs/model-results/PREDICTION_SNAPSHOT_STORAGE.md — do not invent new
// semantics here.
export function getSnapshotStatusExplanation(status: PredictionSnapshotStatus): string {
  return status === "pre_match_locked"
    ? "Captured with a confirmed kickoff time, strictly before kickoff. Verified as a genuine pre-match prediction and safe for accuracy evaluation."
    : "No kickoff time was available to confirm the snapshot was captured before kickoff. Retained for audit, but not treated as a verified pre-match lock.";
}

export const PREDICTION_HISTORY_BRIER_SCORE_EXPLANATION =
  "Lower is better (range 0–2). Measures how close the predicted 1X2 probabilities were to the actual outcome.";

export const PREDICTION_HISTORY_MATCH_CONTEXT_NOTE =
  "Historical match context was not captured for these snapshots.";

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

// ---------------------------------------------------------------------------
// Duplicate-fixture grouping (display only)
//
// A single fixture can have more than one stored snapshot (retries, repeated
// captures, an unverified capture followed by a locked one, and so on). The
// flat list is hard to scan when duplicates repeat the same match. This
// groups the CURRENT PAGE's items by fixtureId and picks a single "preferred"
// snapshot per fixture to show prominently, while keeping every snapshot
// available for QA/audit inside collapsed details.
//
// The preference order intentionally mirrors the evidence gate's
// one-per-fixture selection policy in
// packages/api/src/live-prediction-evidence-gate.ts
// (`one_per_fixture_prefer_pre_match_locked_latest_pre_kickoff`):
// prefer pre_match_locked over foundation_unverified, then the latest
// capturedAt, then snapshotId descending. This is a display-time
// approximation over already-fetched, already-valid list items — it does not
// re-run or conflict with the gate's own audit-grade selection, and it never
// mutates, hides, or discards stored data.
// ---------------------------------------------------------------------------

export interface PredictionHistoryFixtureGroup {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  group: string;
  matchday: number;
  snapshots: readonly PredictionHistoryListItem[];
  preferred: PredictionHistoryListItem;
  evaluatedCount: number;
  totalCount: number;
}

function compareSnapshotPreference(
  a: PredictionHistoryListItem,
  b: PredictionHistoryListItem
): number {
  const statusPriority = (status: PredictionSnapshotStatus): number =>
    status === "pre_match_locked" ? 0 : 1;

  const statusDelta = statusPriority(a.snapshotStatus) - statusPriority(b.snapshotStatus);
  if (statusDelta !== 0) return statusDelta;

  if (a.capturedAt !== b.capturedAt) {
    return a.capturedAt < b.capturedAt ? 1 : -1;
  }

  return a.snapshotId < b.snapshotId ? 1 : a.snapshotId > b.snapshotId ? -1 : 0;
}

export function selectPreferredHistorySnapshot(
  items: readonly PredictionHistoryListItem[]
): PredictionHistoryListItem {
  return [...items].sort(compareSnapshotPreference)[0]!;
}

export function groupPredictionHistoryItemsByFixture(
  items: readonly PredictionHistoryListItem[]
): PredictionHistoryFixtureGroup[] {
  const fixtureOrder: string[] = [];
  const byFixture = new Map<string, PredictionHistoryListItem[]>();

  for (const item of items) {
    const existing = byFixture.get(item.fixtureId);
    if (existing === undefined) {
      fixtureOrder.push(item.fixtureId);
      byFixture.set(item.fixtureId, [item]);
    } else {
      existing.push(item);
    }
  }

  return fixtureOrder.map((fixtureId) => {
    const snapshots = byFixture.get(fixtureId)!;
    const first = snapshots[0]!;

    return {
      fixtureId,
      homeTeam: first.homeTeam,
      awayTeam: first.awayTeam,
      group: first.group,
      matchday: first.matchday,
      snapshots,
      preferred: selectPreferredHistorySnapshot(snapshots),
      evaluatedCount: snapshots.filter((s) => s.evaluation !== null).length,
      totalCount: snapshots.length
    };
  });
}
