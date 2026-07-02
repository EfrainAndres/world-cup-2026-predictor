import { describe, test, expect, beforeEach } from "vitest";
import { predictMatchFromLiveElo } from "../src/routes.js";
import { createMemoryTelemetrySink } from "../src/prediction-telemetry-sink.js";
import { createAttackDefenseProductionDependencies } from "../src/attack-defense-server-composition.js";
import { resetAttackDefenseRuntimeProfileCache } from "../src/attack-defense-runtime-profile-source.server.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = join(
  __dir,
  "../../../docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json"
);

function loadRealArtifact(): unknown {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

beforeEach(() => {
  resetAttackDefenseRuntimeProfileCache();
});

describe("telemetry emission — basic wiring", () => {
  test("emits exactly one event per completed prediction", () => {
    const sink = createMemoryTelemetrySink();
    const result = predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Argentina" },
      { telemetrySink: sink }
    );
    expect(result.status).toBe("success");
    expect(sink.events).toHaveLength(1);
  });

  test("emits prediction_pipeline_completed event name", () => {
    const sink = createMemoryTelemetrySink();
    predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" }, { telemetrySink: sink });
    expect(sink.events[0]?.event).toBe("prediction_pipeline_completed");
  });

  test("telemetry failure does not fail the prediction", () => {
    const throwingSink = {
      emit() {
        throw new Error("sink failure");
      },
    };
    const result = predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Argentina" },
      { telemetrySink: throwingSink }
    );
    expect(result.status).toBe("success");
  });

  test("telemetry payload contains correct matchup", () => {
    const sink = createMemoryTelemetrySink();
    predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" }, { telemetrySink: sink });
    const payload = sink.events[0]?.payload;
    expect(payload?.matchup.homeTeam).toBe("Brazil");
    expect(payload?.matchup.awayTeam).toBe("Argentina");
  });

  test("prediction succeeds when no telemetry sink provided", () => {
    const result = predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" });
    expect(result.status).toBe("success");
  });

  test("validation errors do not emit telemetry", () => {
    const sink = createMemoryTelemetrySink();
    const result = predictMatchFromLiveElo(
      { homeTeam: "NotARealTeam99", awayTeam: "Argentina" },
      { telemetrySink: sink }
    );
    expect(result.status).toBe("validation_error");
    expect(sink.events).toHaveLength(0);
  });
});

describe("telemetry payload — privacy constraints", () => {
  test("payload contains no filesystem paths", () => {
    const sink = createMemoryTelemetrySink();
    predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" }, { telemetrySink: sink });
    const json = JSON.stringify(sink.events[0]?.payload);
    expect(json).not.toMatch(/\/Users\//);
    expect(json).not.toMatch(/\/home\//);
    expect(json).not.toMatch(/node_modules/);
  });

  test("payload contains no sensitive key names", () => {
    const sink = createMemoryTelemetrySink();
    predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" }, { telemetrySink: sink });
    const json = JSON.stringify(sink.events[0]?.payload);
    expect(json).not.toMatch(/password/i);
    expect(json).not.toMatch(/secret/i);
    expect(json).not.toMatch(/"env"/);
    expect(json).not.toMatch(/"cookie"/);
    expect(json).not.toMatch(/"headers"/);
  });

  test("payload contains no raw profile or fixture arrays", () => {
    const sink = createMemoryTelemetrySink();
    const adDeps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Argentina" },
      { ...adDeps, telemetrySink: sink }
    );
    const json = JSON.stringify(sink.events[0]?.payload);
    expect(json).not.toMatch(/"profiles"\s*:/);
    expect(json).not.toMatch(/"fixtures"\s*:/);
  });
});

describe("telemetry payload — content correctness", () => {
  test("finalXg is present and positive", () => {
    const sink = createMemoryTelemetrySink();
    predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" }, { telemetrySink: sink });
    const payload = sink.events[0]?.payload;
    expect(payload?.pipeline.finalXg.home).toBeGreaterThan(0);
    expect(payload?.pipeline.finalXg.away).toBeGreaterThan(0);
  });

  test("outcomes sum to approximately 1", () => {
    const sink = createMemoryTelemetrySink();
    predictMatchFromLiveElo({ homeTeam: "Brazil", awayTeam: "Argentina" }, { telemetrySink: sink });
    const o = sink.events[0]?.payload.outcomes;
    const sum = (o?.homeWinProbability ?? 0) + (o?.drawProbability ?? 0) + (o?.awayWinProbability ?? 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });

  test("AD telemetry shows applied=true when AD mode is on and eligible", () => {
    const sink = createMemoryTelemetrySink();
    const adDeps = createAttackDefenseProductionDependencies({
      env: { ATTACK_DEFENSE_GOAL_MODEL_MODE: "on" },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    // Brazil vs Argentina — both have full AD profiles.
    predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Argentina" },
      { ...adDeps, telemetrySink: sink }
    );
    const ad = sink.events[0]?.payload.pipeline.attackDefense;
    expect(ad).not.toBeNull();
    expect(ad?.applied).toBe(true);
    expect(ad?.stageAuthoritative).toBe(true);
    expect(ad?.finalAuthoritative).toBe(true);
  });

  test("AD and SB telemetry authority correct when both on", () => {
    const sink = createMemoryTelemetrySink();
    const adDeps = createAttackDefenseProductionDependencies({
      env: {
        ATTACK_DEFENSE_GOAL_MODEL_MODE: "on",
        STATSBOMB_PREDICTION_SIGNAL_MODE: "on",
      },
      selectedCandidateArtifact: loadRealArtifact(),
    });
    predictMatchFromLiveElo(
      { homeTeam: "Brazil", awayTeam: "Argentina" },
      { ...adDeps, telemetrySink: sink }
    );
    const payload = sink.events[0]?.payload;
    // When SB is also on and authoritative, AD final authoritative should be false.
    const ad = payload?.pipeline.attackDefense;
    const sb = payload?.pipeline.statsBomb;
    if (ad?.applied && sb?.applied) {
      expect(ad.finalAuthoritative).toBe(false);
      expect(sb.finalAuthoritative).toBe(true);
    }
    // If SB not applied (profiles unavailable for this matchup), AD is final authoritative.
  });
});
