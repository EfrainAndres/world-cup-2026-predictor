import type { WorldCup2026PredictionSnapshot, WorldCup2026PredictionSnapshotCreateResult } from "./schemas.js";

export interface PredictionSnapshotStore {
  create(snapshot: WorldCup2026PredictionSnapshot, idempotencyKey: string): WorldCup2026PredictionSnapshotCreateResult;
  getById(snapshotId: string): WorldCup2026PredictionSnapshot | undefined;
  getByFixtureId(fixtureId: string): readonly WorldCup2026PredictionSnapshot[];
  list(): readonly WorldCup2026PredictionSnapshot[];
  reset(): void;
}

function freezeSnapshot(snapshot: WorldCup2026PredictionSnapshot): WorldCup2026PredictionSnapshot {
  return Object.freeze({
    ...snapshot,
    modelConfiguration: Object.freeze({ ...snapshot.modelConfiguration }),
    inputs: Object.freeze({ ...snapshot.inputs }),
    prediction: Object.freeze({
      ...snapshot.prediction,
      mostLikelyScorelines: Object.freeze([...snapshot.prediction.mostLikelyScorelines])
    }),
    confidence: Object.freeze({
      ...snapshot.confidence,
      reasons: Object.freeze([...snapshot.confidence.reasons]),
      dataPoints: Object.freeze({ ...snapshot.confidence.dataPoints })
    }),
    provenance: Object.freeze({ ...snapshot.provenance })
  });
}

function compareByCapture(a: WorldCup2026PredictionSnapshot, b: WorldCup2026PredictionSnapshot): number {
  const dateCmp = a.capturedAt.localeCompare(b.capturedAt);
  return dateCmp !== 0 ? dateCmp : a.snapshotId.localeCompare(b.snapshotId);
}

export function createInMemorySnapshotStore(): PredictionSnapshotStore {
  const byId = new Map<string, WorldCup2026PredictionSnapshot>();
  const byIdempotency = new Map<string, WorldCup2026PredictionSnapshot>();

  return {
    create(snapshot, idempotencyKey) {
      const existing = byIdempotency.get(idempotencyKey);

      if (existing !== undefined) {
        return {
          result: "existing",
          snapshot: freezeSnapshot(existing),
          idempotencyKey,
          duplicate: true
        };
      }

      const frozen = freezeSnapshot(snapshot);
      byId.set(snapshot.snapshotId, frozen);
      byIdempotency.set(idempotencyKey, frozen);

      return {
        result: "created",
        snapshot: freezeSnapshot(frozen),
        idempotencyKey,
        duplicate: false
      };
    },

    getById(id) {
      const s = byId.get(id);
      return s !== undefined ? freezeSnapshot(s) : undefined;
    },

    getByFixtureId(fixtureId) {
      return [...byId.values()].filter((s) => s.fixtureId === fixtureId).sort(compareByCapture);
    },

    list() {
      return [...byId.values()].sort(compareByCapture);
    },

    reset() {
      byId.clear();
      byIdempotency.clear();
    }
  };
}

export const defaultSnapshotStore: PredictionSnapshotStore = createInMemorySnapshotStore();
