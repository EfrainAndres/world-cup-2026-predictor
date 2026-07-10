import { WORLD_CUP_2026_GROUP_STAGE_FIXTURES } from "./world-cup-2026-teams.js";
import { canonicalizeTeamName, normalizeTeamSearchText } from "./team-aliases.js";
import type {
  PredictionSnapshotStatus,
  WorldCup2026ExternalFixtureRecord,
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionSnapshot
} from "./schemas.js";

export type EvidenceCoverageSnapshotExclusionReason =
  | "not_primary_selection"
  | "malformed_data"
  | "post_kickoff"
  | "unsupported_status";

export interface EvidenceCoverageFixtureRef {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  group?: string;
  matchday?: number;
}

export interface EvidenceCoverageSnapshotRef extends EvidenceCoverageFixtureRef {
  snapshotId: string;
  status: PredictionSnapshotStatus;
  capturedAt: string;
  kickoffAt?: string;
  reason?: EvidenceCoverageSnapshotExclusionReason;
}

export interface EvidenceCoverageEvaluationRef extends EvidenceCoverageFixtureRef {
  snapshotId: string;
  evaluationId: string;
  evaluatedAt: string;
}

export interface EvidenceCoverageAuditReport {
  generatedAt: string;
  counts: {
    completedGroupFixtures: number;
    totalSnapshots: number;
    totalEvaluations: number;
    fixturesWithAnySnapshot: number;
    fixturesWithValidPrimarySnapshot: number;
    fixturesWithPersistedEvaluation: number;
    uniqueEvaluatedFixtures: number;
    duplicateSnapshotFixtures: number;
    duplicateEvaluationFixtures: number;
    duplicateEvaluationSnapshots: number;
    completedFixturesWithoutAnySnapshot: number;
    completedFixturesWithoutValidPrimarySnapshot: number;
    completedFixturesWithSnapshotButNoEvaluation: number;
    excludedSnapshots: number;
  };
  duplicateSnapshotFixtures: Array<{
    fixture: EvidenceCoverageFixtureRef;
    snapshots: EvidenceCoverageSnapshotRef[];
  }>;
  duplicateEvaluationFixtures: Array<{
    fixture: EvidenceCoverageFixtureRef;
    evaluations: EvidenceCoverageEvaluationRef[];
  }>;
  duplicateEvaluationSnapshots: Array<{
    snapshotId: string;
    fixture: EvidenceCoverageFixtureRef;
    evaluations: EvidenceCoverageEvaluationRef[];
  }>;
  completedFixturesWithoutAnySnapshot: EvidenceCoverageFixtureRef[];
  completedFixturesWithoutValidPrimarySnapshot: EvidenceCoverageFixtureRef[];
  completedFixturesWithSnapshotButNoEvaluation: Array<{
    fixture: EvidenceCoverageFixtureRef;
    selectedSnapshot: EvidenceCoverageSnapshotRef;
  }>;
  excludedSnapshots: EvidenceCoverageSnapshotRef[];
}

function teamKey(value: string): string {
  return normalizeTeamSearchText(canonicalizeTeamName(value));
}

function fixtureRef(fixture: (typeof WORLD_CUP_2026_GROUP_STAGE_FIXTURES)[number]): EvidenceCoverageFixtureRef {
  return {
    fixtureId: fixture.id,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    ...(fixture.group === undefined ? {} : { group: fixture.group }),
    ...(fixture.matchday === undefined ? {} : { matchday: fixture.matchday })
  };
}

function snapshotRef(
  snapshot: WorldCup2026PredictionSnapshot,
  reason?: EvidenceCoverageSnapshotExclusionReason
): EvidenceCoverageSnapshotRef {
  return {
    fixtureId: snapshot.fixtureId,
    homeTeam: snapshot.homeTeam,
    awayTeam: snapshot.awayTeam,
    ...(snapshot.group === undefined ? {} : { group: snapshot.group }),
    ...(snapshot.matchday === undefined ? {} : { matchday: snapshot.matchday }),
    snapshotId: snapshot.snapshotId,
    status: snapshot.status,
    capturedAt: snapshot.capturedAt,
    ...(snapshot.kickoffAt === undefined ? {} : { kickoffAt: snapshot.kickoffAt }),
    ...(reason === undefined ? {} : { reason })
  };
}

function evaluationRef(
  evaluation: WorldCup2026PredictionEvaluation,
  snapshot?: WorldCup2026PredictionSnapshot
): EvidenceCoverageEvaluationRef {
  return {
    fixtureId: evaluation.fixtureId,
    homeTeam: snapshot?.homeTeam ?? "",
    awayTeam: snapshot?.awayTeam ?? "",
    ...(snapshot?.group === undefined ? {} : { group: snapshot.group }),
    ...(snapshot?.matchday === undefined ? {} : { matchday: snapshot.matchday }),
    snapshotId: evaluation.snapshotId,
    evaluationId: evaluation.evaluationId,
    evaluatedAt: evaluation.evaluatedAt
  };
}

function resolveCompletedGroupFixture(record: WorldCup2026ExternalFixtureRecord) {
  if (record.status !== "finished") return undefined;

  const byId = WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((fixture) => fixture.id === record.providerFixtureId);
  if (byId !== undefined) return byId;

  return WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find(
    (fixture) =>
      teamKey(fixture.homeTeam) === teamKey(record.homeTeam) &&
      teamKey(fixture.awayTeam) === teamKey(record.awayTeam)
  );
}

function snapshotProbabilitiesValid(snapshot: WorldCup2026PredictionSnapshot): boolean {
  const p = snapshot.prediction;
  const values = [p.homeWinProbability, p.drawProbability, p.awayWinProbability];
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) return false;
  const total = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 0.02) return false;
  return p.mostLikelyScorelines.length > 0;
}

function snapshotIsPreKickoff(snapshot: WorldCup2026PredictionSnapshot): boolean {
  if (snapshot.kickoffAt === undefined) return true;
  const capturedMs = Date.parse(snapshot.capturedAt);
  const kickoffMs = Date.parse(snapshot.kickoffAt);
  if (!Number.isFinite(capturedMs) || !Number.isFinite(kickoffMs)) return false;
  return capturedMs < kickoffMs;
}

function statusPriority(status: PredictionSnapshotStatus): number {
  if (status === "pre_match_locked") return 0;
  if (status === "foundation_unverified") return 1;
  return 2;
}

function selectPrimarySnapshot(
  snapshots: readonly WorldCup2026PredictionSnapshot[]
): {
  selected?: WorldCup2026PredictionSnapshot;
  excluded: EvidenceCoverageSnapshotRef[];
} {
  const eligible = snapshots.filter(
    (snapshot) =>
      (snapshot.status === "pre_match_locked" || snapshot.status === "foundation_unverified") &&
      snapshotProbabilitiesValid(snapshot) &&
      snapshotIsPreKickoff(snapshot)
  );

  const sorted = [...eligible].sort((a, b) => {
    const statusCompare = statusPriority(a.status) - statusPriority(b.status);
    if (statusCompare !== 0) return statusCompare;
    const capturedCompare = b.capturedAt.localeCompare(a.capturedAt);
    if (capturedCompare !== 0) return capturedCompare;
    return b.snapshotId.localeCompare(a.snapshotId);
  });

  const selected = sorted[0];
  const excluded = snapshots
    .filter((snapshot) => snapshot.snapshotId !== selected?.snapshotId)
    .map((snapshot) => {
      let reason: EvidenceCoverageSnapshotExclusionReason = "not_primary_selection";
      if (snapshot.status !== "pre_match_locked" && snapshot.status !== "foundation_unverified") {
        reason = "unsupported_status";
      } else if (!snapshotProbabilitiesValid(snapshot)) {
        reason = "malformed_data";
      } else if (!snapshotIsPreKickoff(snapshot)) {
        reason = "post_kickoff";
      }
      return snapshotRef(snapshot, reason);
    });

  return selected === undefined ? { excluded } : { selected, excluded };
}

function pushByKey<T>(map: Map<string, T[]>, key: string, value: T): void {
  const current = map.get(key);
  if (current === undefined) map.set(key, [value]);
  else current.push(value);
}

export function buildEvidenceCoverageAudit(input: {
  generatedAt: string;
  snapshots: readonly WorldCup2026PredictionSnapshot[];
  evaluations: readonly WorldCup2026PredictionEvaluation[];
  completedResults: readonly WorldCup2026ExternalFixtureRecord[];
}): EvidenceCoverageAuditReport {
  const completedByFixture = new Map<string, (typeof WORLD_CUP_2026_GROUP_STAGE_FIXTURES)[number]>();
  for (const record of input.completedResults) {
    const fixture = resolveCompletedGroupFixture(record);
    if (fixture !== undefined) completedByFixture.set(fixture.id, fixture);
  }

  const snapshotsByFixture = new Map<string, WorldCup2026PredictionSnapshot[]>();
  for (const snapshot of input.snapshots) {
    pushByKey(snapshotsByFixture, snapshot.fixtureId, snapshot);
  }

  const snapshotsById = new Map(input.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
  const evaluationsByFixture = new Map<string, WorldCup2026PredictionEvaluation[]>();
  const evaluationsBySnapshot = new Map<string, WorldCup2026PredictionEvaluation[]>();
  for (const evaluation of input.evaluations) {
    pushByKey(evaluationsByFixture, evaluation.fixtureId, evaluation);
    pushByKey(evaluationsBySnapshot, evaluation.snapshotId, evaluation);
  }

  const selectedByFixture = new Map<string, WorldCup2026PredictionSnapshot>();
  const excludedSnapshots: EvidenceCoverageSnapshotRef[] = [];
  for (const [fixtureId, snapshots] of snapshotsByFixture) {
    const selection = selectPrimarySnapshot(snapshots);
    excludedSnapshots.push(...selection.excluded);
    if (selection.selected !== undefined) selectedByFixture.set(fixtureId, selection.selected);
  }

  const duplicateSnapshotFixtures = [...snapshotsByFixture.entries()]
    .filter(([, snapshots]) => snapshots.length > 1)
    .map(([fixtureId, snapshots]) => ({
      fixture: fixtureRef(
        WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((fixture) => fixture.id === fixtureId) ??
          ({
            id: fixtureId,
            homeTeam: snapshots[0]?.homeTeam ?? "",
            awayTeam: snapshots[0]?.awayTeam ?? ""
          } as (typeof WORLD_CUP_2026_GROUP_STAGE_FIXTURES)[number])
      ),
      snapshots: snapshots.map((snapshot) => snapshotRef(snapshot))
    }));

  const duplicateEvaluationFixtures = [...evaluationsByFixture.entries()]
    .filter(([, evaluations]) => evaluations.length > 1)
    .map(([fixtureId, evaluations]) => ({
      fixture: fixtureRef(
        WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((fixture) => fixture.id === fixtureId) ??
          ({
            id: fixtureId,
            homeTeam: snapshotsById.get(evaluations[0]!.snapshotId)?.homeTeam ?? "",
            awayTeam: snapshotsById.get(evaluations[0]!.snapshotId)?.awayTeam ?? ""
          } as (typeof WORLD_CUP_2026_GROUP_STAGE_FIXTURES)[number])
      ),
      evaluations: evaluations.map((evaluation) => evaluationRef(evaluation, snapshotsById.get(evaluation.snapshotId)))
    }));

  const duplicateEvaluationSnapshots = [...evaluationsBySnapshot.entries()]
    .filter(([, evaluations]) => evaluations.length > 1)
    .map(([snapshotId, evaluations]) => {
      const snapshot = snapshotsById.get(snapshotId);
      const fixture =
        WORLD_CUP_2026_GROUP_STAGE_FIXTURES.find((candidate) => candidate.id === evaluations[0]?.fixtureId) ??
        ({
          id: evaluations[0]?.fixtureId ?? "",
          homeTeam: snapshot?.homeTeam ?? "",
          awayTeam: snapshot?.awayTeam ?? ""
        } as (typeof WORLD_CUP_2026_GROUP_STAGE_FIXTURES)[number]);
      return {
        snapshotId,
        fixture: fixtureRef(fixture),
        evaluations: evaluations.map((evaluation) => evaluationRef(evaluation, snapshot))
      };
    });

  const completedFixturesWithoutAnySnapshot = [...completedByFixture.values()]
    .filter((fixture) => !snapshotsByFixture.has(fixture.id))
    .map(fixtureRef);

  const completedFixturesWithoutValidPrimarySnapshot = [...completedByFixture.values()]
    .filter((fixture) => !selectedByFixture.has(fixture.id))
    .map(fixtureRef);

  const completedFixturesWithSnapshotButNoEvaluation = [...completedByFixture.values()]
    .map((fixture) => ({ fixture, selectedSnapshot: selectedByFixture.get(fixture.id) }))
    .filter(
      (entry): entry is { fixture: (typeof WORLD_CUP_2026_GROUP_STAGE_FIXTURES)[number]; selectedSnapshot: WorldCup2026PredictionSnapshot } =>
        entry.selectedSnapshot !== undefined && !evaluationsBySnapshot.has(entry.selectedSnapshot.snapshotId)
    )
    .map((entry) => ({
      fixture: fixtureRef(entry.fixture),
      selectedSnapshot: snapshotRef(entry.selectedSnapshot)
    }));

  const uniqueEvaluatedFixtures = [...selectedByFixture.values()].filter((snapshot) =>
    evaluationsBySnapshot.has(snapshot.snapshotId)
  ).length;

  return {
    generatedAt: input.generatedAt,
    counts: {
      completedGroupFixtures: completedByFixture.size,
      totalSnapshots: input.snapshots.length,
      totalEvaluations: input.evaluations.length,
      fixturesWithAnySnapshot: snapshotsByFixture.size,
      fixturesWithValidPrimarySnapshot: selectedByFixture.size,
      fixturesWithPersistedEvaluation: evaluationsByFixture.size,
      uniqueEvaluatedFixtures,
      duplicateSnapshotFixtures: duplicateSnapshotFixtures.length,
      duplicateEvaluationFixtures: duplicateEvaluationFixtures.length,
      duplicateEvaluationSnapshots: duplicateEvaluationSnapshots.length,
      completedFixturesWithoutAnySnapshot: completedFixturesWithoutAnySnapshot.length,
      completedFixturesWithoutValidPrimarySnapshot: completedFixturesWithoutValidPrimarySnapshot.length,
      completedFixturesWithSnapshotButNoEvaluation: completedFixturesWithSnapshotButNoEvaluation.length,
      excludedSnapshots: excludedSnapshots.length
    },
    duplicateSnapshotFixtures,
    duplicateEvaluationFixtures,
    duplicateEvaluationSnapshots,
    completedFixturesWithoutAnySnapshot,
    completedFixturesWithoutValidPrimarySnapshot,
    completedFixturesWithSnapshotButNoEvaluation,
    excludedSnapshots
  };
}
