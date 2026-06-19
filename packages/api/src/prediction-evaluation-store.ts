import type {
  WorldCup2026PredictionEvaluation,
  WorldCup2026PredictionEvaluationCreateResult
} from "./schemas.js";

export interface PredictionEvaluationStore {
  create(
    evaluation: WorldCup2026PredictionEvaluation,
    identityKey: string
  ): WorldCup2026PredictionEvaluationCreateResult;
  getById(evaluationId: string): WorldCup2026PredictionEvaluation | undefined;
  getBySnapshotId(snapshotId: string): WorldCup2026PredictionEvaluation | undefined;
  getByFixtureId(fixtureId: string): readonly WorldCup2026PredictionEvaluation[];
  list(): readonly WorldCup2026PredictionEvaluation[];
  reset(): void;
}

function freezeEvaluation(
  evaluation: WorldCup2026PredictionEvaluation
): WorldCup2026PredictionEvaluation {
  return Object.freeze({
    ...evaluation,
    predicted: Object.freeze({
      ...evaluation.predicted,
      predictedScoreline: Object.freeze({ ...evaluation.predicted.predictedScoreline }),
      mostLikelyScorelines: Object.freeze(
        evaluation.predicted.mostLikelyScorelines.map((scoreline) =>
          Object.freeze({ ...scoreline })
        )
      )
    }),
    actual: Object.freeze({ ...evaluation.actual }),
    metrics: Object.freeze({ ...evaluation.metrics }),
    confidence: Object.freeze({ ...evaluation.confidence }),
    provenance: Object.freeze({ ...evaluation.provenance })
  });
}

function compareEvaluations(
  a: WorldCup2026PredictionEvaluation,
  b: WorldCup2026PredictionEvaluation
): number {
  const evaluatedAtCmp = a.evaluatedAt.localeCompare(b.evaluatedAt);
  return evaluatedAtCmp !== 0
    ? evaluatedAtCmp
    : a.evaluationId.localeCompare(b.evaluationId);
}

export function createInMemoryPredictionEvaluationStore(): PredictionEvaluationStore {
  const byId = new Map<string, WorldCup2026PredictionEvaluation>();
  const byIdentity = new Map<string, WorldCup2026PredictionEvaluation>();

  return {
    create(evaluation, identityKey) {
      const existing = byIdentity.get(identityKey);

      if (existing !== undefined) {
        return {
          result: "existing",
          evaluation: freezeEvaluation(existing),
          identityKey,
          duplicate: true
        };
      }

      const frozen = freezeEvaluation(evaluation);
      byId.set(frozen.evaluationId, frozen);
      byIdentity.set(identityKey, frozen);

      return {
        result: "created",
        evaluation: freezeEvaluation(frozen),
        identityKey,
        duplicate: false
      };
    },

    getById(evaluationId) {
      const evaluation = byId.get(evaluationId);
      return evaluation !== undefined ? freezeEvaluation(evaluation) : undefined;
    },

    getBySnapshotId(snapshotId) {
      const evaluation = [...byId.values()].find(
        (entry) => entry.snapshotId === snapshotId
      );
      return evaluation !== undefined ? freezeEvaluation(evaluation) : undefined;
    },

    getByFixtureId(fixtureId) {
      return [...byId.values()]
        .filter((entry) => entry.fixtureId === fixtureId)
        .sort(compareEvaluations)
        .map((entry) => freezeEvaluation(entry));
    },

    list() {
      return [...byId.values()]
        .sort(compareEvaluations)
        .map((entry) => freezeEvaluation(entry));
    },

    reset() {
      byId.clear();
      byIdentity.clear();
    }
  };
}

export const defaultPredictionEvaluationStore: PredictionEvaluationStore =
  createInMemoryPredictionEvaluationStore();
