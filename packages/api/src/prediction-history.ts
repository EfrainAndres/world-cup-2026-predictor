import type { Sql } from "postgres";
import { SnapshotStorageError } from "./async-snapshot-store.js";
import { rowToEvaluation } from "./postgres-evaluation-store.js";
import { rowToSnapshot } from "./postgres-snapshot-store.js";
import type { PredictionEvaluationStore } from "./prediction-evaluation-store.js";
import type { PredictionSnapshotStore } from "./snapshot-store.js";
import { normalizeTeamSearchText } from "./team-aliases.js";
import type {
  PredictionHistoryEvaluationState,
  PredictionHistoryListFilters,
  PredictionHistoryListItem,
  PredictionHistoryListPagination,
  PredictionHistoryListQuery,
  PredictionHistoryListSort,
  PredictionHistoryListSummary,
  PredictionSnapshotStatus,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot
} from "./schemas.js";

export const PREDICTION_HISTORY_DEFAULT_PAGE = 1;
export const PREDICTION_HISTORY_DEFAULT_PAGE_SIZE = 20;
export const PREDICTION_HISTORY_ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
export const PREDICTION_HISTORY_DEFAULT_SORT = "captured_desc" as const;
const VALID_GROUPS = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]);

interface SnapshotRow {
  snapshot_id: string;
  fixture_id: string;
  provider_fixture_id: string | null;
  snapshot_status: string;
  captured_at: Date;
  cutoff_at: Date;
  kickoff_at: Date | null;
  group_code: string | null;
  matchday: number | null;
  home_team: string;
  away_team: string;
  model_version: string;
  formula_version: string;
  snapshot_schema_version: string;
  idempotency_key: string;
  content_hash: string;
  prediction_payload: unknown;
  confidence_payload: unknown;
  provenance_payload: unknown;
  created_at: Date;
}

interface EvaluationRow {
  evaluation_id: string;
  snapshot_id: string;
  fixture_id: string;
  provider_fixture_id: string | null;
  model_version: string;
  metric_version: string;
  evaluation_schema_version: string;
  result_identity: string;
  evaluated_at: Date;
  actual_home_goals: number;
  actual_away_goals: number;
  actual_outcome: string;
  metrics_payload: unknown;
  confidence_payload: unknown;
  provenance_payload: unknown;
  created_at: Date;
}

export interface ValidatedPredictionHistoryListQuery {
  group?: string;
  team?: string;
  fixtureId?: string;
  status?: PredictionSnapshotStatus;
  evaluationState: PredictionHistoryEvaluationState;
  page: number;
  pageSize: (typeof PREDICTION_HISTORY_ALLOWED_PAGE_SIZES)[number];
  sort: PredictionHistoryListSort;
}

export interface PredictionHistoryListResult {
  items: PredictionHistoryListItem[];
  summary: PredictionHistoryListSummary;
  pagination: PredictionHistoryListPagination;
  filters: PredictionHistoryListFilters;
}

export interface PredictionHistoryReadStore {
  list(query: ValidatedPredictionHistoryListQuery): Promise<PredictionHistoryListResult>;
}

function compareScorelines(
  a: WorldCup2026PredictionSnapshot["prediction"]["mostLikelyScorelines"][number],
  b: WorldCup2026PredictionSnapshot["prediction"]["mostLikelyScorelines"][number]
): number {
  const probabilityCompare = b.probability - a.probability;
  if (probabilityCompare !== 0) return probabilityCompare;

  const totalGoalsCompare = a.homeGoals + a.awayGoals - (b.homeGoals + b.awayGoals);
  if (totalGoalsCompare !== 0) return totalGoalsCompare;
  if (a.homeGoals !== b.homeGoals) return a.homeGoals - b.homeGoals;
  return a.awayGoals - b.awayGoals;
}

function selectProjectedScore(snapshot: WorldCup2026PredictionSnapshot): {
  home: number;
  away: number;
} {
  const selected = [...snapshot.prediction.mostLikelyScorelines].sort(compareScorelines)[0];
  if (selected === undefined) {
    return { home: 0, away: 0 };
  }

  return {
    home: selected.homeGoals,
    away: selected.awayGoals
  };
}

function compareEvaluationPreference(
  a: WorldCup2026PredictionEvaluation,
  b: WorldCup2026PredictionEvaluation
): number {
  const evaluatedAtCompare = b.evaluatedAt.localeCompare(a.evaluatedAt);
  if (evaluatedAtCompare !== 0) return evaluatedAtCompare;
  return b.evaluationId.localeCompare(a.evaluationId);
}

function toListItem(
  snapshot: WorldCup2026PredictionSnapshot,
  evaluation: WorldCup2026PredictionEvaluation | null
): PredictionHistoryListItem {
  return {
    snapshotId: snapshot.snapshotId,
    fixtureId: snapshot.fixtureId,
    group: snapshot.group ?? "",
    matchday: snapshot.matchday ?? 0,
    homeTeam: snapshot.homeTeam,
    awayTeam: snapshot.awayTeam,
    kickoffAt: snapshot.kickoffAt ?? null,
    capturedAt: snapshot.capturedAt,
    snapshotStatus: snapshot.status,
    projectedScore: selectProjectedScore(snapshot),
    expectedGoals: {
      home: snapshot.prediction.homeExpectedGoals,
      away: snapshot.prediction.awayExpectedGoals
    },
    outcomeProbabilities: {
      homeWin: snapshot.prediction.homeWinProbability,
      draw: snapshot.prediction.drawProbability,
      awayWin: snapshot.prediction.awayWinProbability
    },
    confidence: {
      level: snapshot.confidence.level,
      coverage: snapshot.confidence.coverageType
    },
    evaluation:
      evaluation === null
        ? null
        : {
            evaluationId: evaluation.evaluationId,
            evaluatedAt: evaluation.evaluatedAt,
            actualScore: {
              home: evaluation.actual.homeGoals,
              away: evaluation.actual.awayGoals
            },
            actualOutcome: evaluation.actual.outcome,
            brierScore: evaluation.metrics.brierScore,
            logLoss: evaluation.metrics.logLoss,
            homeGoalAbsoluteError: evaluation.metrics.homeGoalAbsoluteError,
            awayGoalAbsoluteError: evaluation.metrics.awayGoalAbsoluteError,
            scorelineCorrect: evaluation.metrics.exactScoreCorrect,
            outcomeCorrect: evaluation.metrics.outcomeCorrect
          }
  };
}

function compareNullableIso(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

function compareItems(
  a: PredictionHistoryListItem,
  b: PredictionHistoryListItem,
  sort: PredictionHistoryListSort
): number {
  switch (sort) {
    case "captured_asc": {
      const compare = a.capturedAt.localeCompare(b.capturedAt);
      return compare !== 0 ? compare : a.snapshotId.localeCompare(b.snapshotId);
    }
    case "captured_desc": {
      const compare = b.capturedAt.localeCompare(a.capturedAt);
      return compare !== 0 ? compare : a.snapshotId.localeCompare(b.snapshotId);
    }
    case "kickoff_asc": {
      const compare = compareNullableIso(a.kickoffAt, b.kickoffAt);
      return compare !== 0 ? compare : a.snapshotId.localeCompare(b.snapshotId);
    }
    case "kickoff_desc": {
      const compare = compareNullableIso(b.kickoffAt, a.kickoffAt);
      return compare !== 0 ? compare : a.snapshotId.localeCompare(b.snapshotId);
    }
  }
}

function matchesTeam(snapshot: WorldCup2026PredictionSnapshot, teamFilter: string): boolean {
  const normalizedFilter = normalizeTeamSearchText(teamFilter);
  const home = normalizeTeamSearchText(snapshot.homeTeam);
  const away = normalizeTeamSearchText(snapshot.awayTeam);
  return home.includes(normalizedFilter) || away.includes(normalizedFilter);
}

function matchesQuery(
  snapshot: WorldCup2026PredictionSnapshot,
  evaluation: WorldCup2026PredictionEvaluation | null,
  query: ValidatedPredictionHistoryListQuery
): boolean {
  if (query.group !== undefined && snapshot.group !== query.group) {
    return false;
  }

  if (query.fixtureId !== undefined && snapshot.fixtureId !== query.fixtureId) {
    return false;
  }

  if (query.status !== undefined && snapshot.status !== query.status) {
    return false;
  }

  if (query.team !== undefined && !matchesTeam(snapshot, query.team)) {
    return false;
  }

  if (query.evaluationState === "evaluated" && evaluation === null) {
    return false;
  }

  if (query.evaluationState === "pending" && evaluation !== null) {
    return false;
  }

  return true;
}

function buildSummary(items: readonly PredictionHistoryListItem[]): PredictionHistoryListSummary {
  const evaluatedItems = items.filter((item) => item.evaluation !== null);
  const pendingItems = items.length - evaluatedItems.length;
  const accuracyDenominator = evaluatedItems.length;

  const outcomeAccuracy =
    accuracyDenominator === 0
      ? null
      : evaluatedItems.filter((item) => item.evaluation?.outcomeCorrect).length /
        accuracyDenominator;
  const exactScoreAccuracy =
    accuracyDenominator === 0
      ? null
      : evaluatedItems.filter((item) => item.evaluation?.scorelineCorrect).length /
        accuracyDenominator;
  const averageBrierScore =
    accuracyDenominator === 0
      ? null
      : evaluatedItems.reduce((sum, item) => sum + (item.evaluation?.brierScore ?? 0), 0) /
        accuracyDenominator;

  return {
    totalSnapshots: items.length,
    evaluatedSnapshots: evaluatedItems.length,
    pendingSnapshots: pendingItems,
    outcomeAccuracy,
    exactScoreAccuracy,
    averageBrierScore
  };
}

function buildPagination(
  page: number,
  pageSize: number,
  totalItems: number
): PredictionHistoryListPagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages
  };
}

function buildFilters(query: ValidatedPredictionHistoryListQuery): PredictionHistoryListFilters {
  return {
    group: query.group ?? null,
    team: query.team ?? null,
    fixtureId: query.fixtureId ?? null,
    status: query.status ?? null,
    evaluationState: query.evaluationState,
    sort: query.sort
  };
}

export function validatePredictionHistoryListQuery(query: PredictionHistoryListQuery = {}): {
  issues: { field: string; message: string }[];
  value?: ValidatedPredictionHistoryListQuery;
} {
  const issues: { field: string; message: string }[] = [];

  const rawGroup = query.group?.trim();
  const group = rawGroup === undefined || rawGroup === "" ? undefined : rawGroup.toUpperCase();
  if (group !== undefined && !VALID_GROUPS.has(group)) {
    issues.push({ field: "group", message: "group must be one of A through L." });
  }

  const team = query.team?.trim() === "" ? undefined : query.team?.trim();
  const fixtureId = query.fixtureId?.trim() === "" ? undefined : query.fixtureId?.trim();

  const status = query.status;
  if (
    status !== undefined &&
    status !== "pre_match_locked" &&
    status !== "foundation_unverified"
  ) {
    issues.push({
      field: "status",
      message: 'status must be "pre_match_locked" or "foundation_unverified".'
    });
  }

  const evaluationState = query.evaluationState ?? "all";
  if (
    evaluationState !== "all" &&
    evaluationState !== "evaluated" &&
    evaluationState !== "pending"
  ) {
    issues.push({
      field: "evaluationState",
      message: 'evaluationState must be "all", "evaluated", or "pending".'
    });
  }

  const page = query.page ?? PREDICTION_HISTORY_DEFAULT_PAGE;
  if (!Number.isInteger(page) || page < 1) {
    issues.push({ field: "page", message: "page must be an integer greater than or equal to 1." });
  }

  const pageSize = query.pageSize ?? PREDICTION_HISTORY_DEFAULT_PAGE_SIZE;
  if (!PREDICTION_HISTORY_ALLOWED_PAGE_SIZES.includes(pageSize as never)) {
    issues.push({ field: "pageSize", message: "pageSize must be one of 10, 20, or 50." });
  }

  const sort = query.sort ?? PREDICTION_HISTORY_DEFAULT_SORT;
  if (
    sort !== "captured_desc" &&
    sort !== "captured_asc" &&
    sort !== "kickoff_desc" &&
    sort !== "kickoff_asc"
  ) {
    issues.push({
      field: "sort",
      message:
        'sort must be "captured_desc", "captured_asc", "kickoff_desc", or "kickoff_asc".'
    });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues,
    value: {
      ...(group === undefined ? {} : { group }),
      ...(team === undefined ? {} : { team }),
      ...(fixtureId === undefined ? {} : { fixtureId }),
      ...(status === undefined ? {} : { status }),
      evaluationState,
      page,
      pageSize: pageSize as (typeof PREDICTION_HISTORY_ALLOWED_PAGE_SIZES)[number],
      sort
    }
  };
}

export function createInMemoryPredictionHistoryReadStore(
  snapshotStore: PredictionSnapshotStore,
  evaluationStore: PredictionEvaluationStore
): PredictionHistoryReadStore {
  return {
    async list(query) {
      const evaluationsBySnapshotId = new Map<string, WorldCup2026PredictionEvaluation>();
      for (const evaluation of evaluationStore.list()) {
        const existing = evaluationsBySnapshotId.get(evaluation.snapshotId);
        if (
          existing === undefined ||
          compareEvaluationPreference(evaluation, existing) < 0
        ) {
          evaluationsBySnapshotId.set(evaluation.snapshotId, evaluation);
        }
      }

      const filteredItems = snapshotStore
        .list()
        .map((snapshot) => {
          const evaluation = evaluationsBySnapshotId.get(snapshot.snapshotId) ?? null;
          return { snapshot, evaluation };
        })
        .filter(({ snapshot, evaluation }) => matchesQuery(snapshot, evaluation, query))
        .map(({ snapshot, evaluation }) => toListItem(snapshot, evaluation))
        .sort((a, b) => compareItems(a, b, query.sort));

      const totalItems = filteredItems.length;
      const start = (query.page - 1) * query.pageSize;
      const pagedItems = filteredItems.slice(start, start + query.pageSize);

      return {
        items: pagedItems,
        summary: buildSummary(filteredItems),
        pagination: buildPagination(query.page, query.pageSize, totalItems),
        filters: buildFilters(query)
      };
    }
  };
}

function buildSortOrder(sort: PredictionHistoryListSort): string {
  switch (sort) {
    case "captured_asc":
      return "s.captured_at ASC, s.snapshot_id ASC";
    case "captured_desc":
      return "s.captured_at DESC, s.snapshot_id ASC";
    case "kickoff_asc":
      return "CASE WHEN s.kickoff_at IS NULL THEN 1 ELSE 0 END, s.kickoff_at ASC, s.snapshot_id ASC";
    case "kickoff_desc":
      return "CASE WHEN s.kickoff_at IS NULL THEN 1 ELSE 0 END, s.kickoff_at DESC, s.snapshot_id ASC";
  }
}

function buildWhereClauses(query: ValidatedPredictionHistoryListQuery): {
  sqlText: string;
  values: readonly unknown[];
} {
  const clauses: string[] = [];
  const values: unknown[] = [];

  function next(value: unknown): string {
    values.push(value);
    return `$${values.length}`;
  }

  if (query.group !== undefined) {
    clauses.push(`s.group_code = ${next(query.group)}`);
  }

  if (query.fixtureId !== undefined) {
    clauses.push(`s.fixture_id = ${next(query.fixtureId)}`);
  }

  if (query.status !== undefined) {
    clauses.push(`s.snapshot_status = ${next(query.status)}`);
  }

  if (query.team !== undefined) {
    const normalized = `%${normalizeTeamSearchText(query.team)}%`;
    clauses.push(
      `(LOWER(s.home_team) LIKE ${next(normalized)} OR LOWER(s.away_team) LIKE ${next(normalized)})`
    );
  }

  if (query.evaluationState === "evaluated") {
    clauses.push("EXISTS (SELECT 1 FROM prediction_evaluations e WHERE e.snapshot_id = s.snapshot_id)");
  }

  if (query.evaluationState === "pending") {
    clauses.push("NOT EXISTS (SELECT 1 FROM prediction_evaluations e WHERE e.snapshot_id = s.snapshot_id)");
  }

  return {
    sqlText: clauses.length === 0 ? "TRUE" : clauses.join(" AND "),
    values
  };
}

function sqlValueArray(values: readonly unknown[]): any[] {
  return [...values];
}

export function createPostgresPredictionHistoryReadStore(sql: Sql): PredictionHistoryReadStore {
  return {
    async list(query) {
      const where = buildWhereClauses(query);
      const orderBy = buildSortOrder(query.sort);
      const offset = (query.page - 1) * query.pageSize;

      try {
        const countRows = await sql.unsafe<{ total_count: string }[]>(
          `SELECT COUNT(*)::text AS total_count FROM prediction_snapshots s WHERE ${where.sqlText}`,
          sqlValueArray(where.values)
        );
        const totalItems = Number(countRows[0]?.total_count ?? "0");

        const snapshotRows = await sql.unsafe<SnapshotRow[]>(
          `SELECT s.*
           FROM prediction_snapshots s
           WHERE ${where.sqlText}
           ORDER BY ${orderBy}
           LIMIT ${query.pageSize}
           OFFSET ${offset}`,
          sqlValueArray(where.values)
        );

        const snapshots = snapshotRows.map((row) => rowToSnapshot(row));
        const snapshotIds = snapshots.map((snapshot) => snapshot.snapshotId);

        let evaluationsBySnapshotId = new Map<string, WorldCup2026PredictionEvaluation>();
        if (snapshotIds.length > 0) {
          const evaluationRows = await sql<EvaluationRow[]>`
            SELECT DISTINCT ON (snapshot_id) *
            FROM prediction_evaluations
            WHERE snapshot_id IN ${sql(snapshotIds)}
            ORDER BY snapshot_id ASC, evaluated_at DESC, evaluation_id DESC
          `;
          evaluationsBySnapshotId = new Map(
            evaluationRows.map((row) => {
              const evaluation = rowToEvaluation(row);
              return [evaluation.snapshotId, evaluation] as const;
            })
          );
        }

        const items = snapshots.map((snapshot) =>
          toListItem(snapshot, evaluationsBySnapshotId.get(snapshot.snapshotId) ?? null)
        );

        const summaryRows = await sql.unsafe<{
          total_snapshots: string;
          evaluated_snapshots: string;
          pending_snapshots: string;
          outcome_accuracy: number | null;
          exact_score_accuracy: number | null;
          average_brier_score: number | null;
        }[]>(
          `WITH filtered_snapshots AS (
             SELECT s.snapshot_id
             FROM prediction_snapshots s
             WHERE ${where.sqlText}
           ),
           selected_evaluations AS (
             SELECT DISTINCT ON (e.snapshot_id)
               e.snapshot_id,
               ((e.metrics_payload -> 'metrics' ->> 'outcomeCorrect')::boolean) AS outcome_correct,
               ((e.metrics_payload -> 'metrics' ->> 'exactScoreCorrect')::boolean) AS exact_score_correct,
               ((e.metrics_payload -> 'metrics' ->> 'brierScore')::double precision) AS brier_score
             FROM prediction_evaluations e
             INNER JOIN filtered_snapshots s ON s.snapshot_id = e.snapshot_id
             ORDER BY e.snapshot_id ASC, e.evaluated_at DESC, e.evaluation_id DESC
           )
           SELECT
             COUNT(*)::text AS total_snapshots,
             COUNT(se.snapshot_id)::text AS evaluated_snapshots,
             (COUNT(*) - COUNT(se.snapshot_id))::text AS pending_snapshots,
             AVG(CASE WHEN se.snapshot_id IS NULL THEN NULL WHEN se.outcome_correct THEN 1.0 ELSE 0.0 END) AS outcome_accuracy,
             AVG(CASE WHEN se.snapshot_id IS NULL THEN NULL WHEN se.exact_score_correct THEN 1.0 ELSE 0.0 END) AS exact_score_accuracy,
             AVG(se.brier_score) AS average_brier_score
           FROM filtered_snapshots fs
           LEFT JOIN selected_evaluations se ON se.snapshot_id = fs.snapshot_id`,
          sqlValueArray(where.values)
        );

        const summaryRow = summaryRows[0];
        const summary: PredictionHistoryListSummary = {
          totalSnapshots: Number(summaryRow?.total_snapshots ?? "0"),
          evaluatedSnapshots: Number(summaryRow?.evaluated_snapshots ?? "0"),
          pendingSnapshots: Number(summaryRow?.pending_snapshots ?? "0"),
          outcomeAccuracy: summaryRow?.outcome_accuracy ?? null,
          exactScoreAccuracy: summaryRow?.exact_score_accuracy ?? null,
          averageBrierScore: summaryRow?.average_brier_score ?? null
        };

        return {
          items,
          summary,
          pagination: buildPagination(query.page, query.pageSize, totalItems),
          filters: buildFilters(query)
        };
      } catch (error) {
        if (error instanceof SnapshotStorageError) {
          throw error;
        }

        throw new SnapshotStorageError(
          "query_failed",
          "Failed to list prediction history records",
          error
        );
      }
    }
  };
}
