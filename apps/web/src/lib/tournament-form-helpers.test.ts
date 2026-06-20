import { describe, expect, test } from "vitest";
import {
  buildTournamentFormRequestField,
  getTournamentFormDisplayState
} from "./tournament-form-helpers";
import type { TournamentFormAdjustmentResult } from "./tournament-form-helpers";

function makeAppliedAdj(overrides: Partial<TournamentFormAdjustmentResult> = {}): TournamentFormAdjustmentResult {
  return {
    enabled: true,
    applied: true,
    home: { baselineElo: 1700, adjustment: 8, effectiveElo: 1708, matchesIncluded: 3 },
    away: { baselineElo: 1620, adjustment: -4, effectiveElo: 1616, matchesIncluded: 2 },
    formulaVersion: "wc2026-tournament-form-v1",
    warnings: [],
    ...overrides
  };
}

describe("buildTournamentFormRequestField", () => {
  test("returns { enabled: true } when enabled is true", () => {
    expect(buildTournamentFormRequestField(true)).toEqual({ enabled: true });
  });

  test("returns undefined when enabled is false", () => {
    expect(buildTournamentFormRequestField(false)).toBeUndefined();
  });
});

describe("getTournamentFormDisplayState", () => {
  test("returns disabled when adj is undefined", () => {
    expect(getTournamentFormDisplayState(undefined)).toEqual({ status: "disabled" });
  });

  test("returns disabled when adj.enabled is false", () => {
    const adj = makeAppliedAdj({ enabled: false, applied: false });
    expect(getTournamentFormDisplayState(adj)).toEqual({ status: "disabled" });
  });

  test("returns not_applied when enabled but not applied", () => {
    const adj = makeAppliedAdj({
      applied: false,
      home: { baselineElo: 1700, adjustment: 0, effectiveElo: 1700, matchesIncluded: 0 },
      away: { baselineElo: 1620, adjustment: 0, effectiveElo: 1620, matchesIncluded: 0 },
      warnings: ["Insufficient completed tournament matches for Mexico (0 < 2 required)."]
    });

    const result = getTournamentFormDisplayState(adj);
    expect(result.status).toBe("not_applied");
    if (result.status !== "not_applied") return;
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Insufficient");
  });

  test("returns applied with adj data when enabled and applied", () => {
    const adj = makeAppliedAdj();
    const result = getTournamentFormDisplayState(adj);

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.adj.home.baselineElo).toBe(1700);
    expect(result.adj.home.adjustment).toBe(8);
    expect(result.adj.home.effectiveElo).toBe(1708);
    expect(result.adj.away.matchesIncluded).toBe(2);
    expect(result.adj.formulaVersion).toBe("wc2026-tournament-form-v1");
  });

  test("applied state includes optional form score when present", () => {
    const adj = makeAppliedAdj({
      home: { baselineElo: 1700, adjustment: 8, effectiveElo: 1708, matchesIncluded: 3, formScore: 7.5 },
      away: { baselineElo: 1620, adjustment: -4, effectiveElo: 1616, matchesIncluded: 2 }
    });

    const result = getTournamentFormDisplayState(adj);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.adj.home.formScore).toBe(7.5);
    expect(result.adj.away.formScore).toBeUndefined();
  });

  test("not_applied state propagates empty warnings array", () => {
    const adj = makeAppliedAdj({ applied: false, warnings: [] });
    const result = getTournamentFormDisplayState(adj);

    expect(result.status).toBe("not_applied");
    if (result.status !== "not_applied") return;
    expect(result.warnings).toHaveLength(0);
  });

  test("not_applied state propagates multiple warnings", () => {
    const adj = makeAppliedAdj({
      applied: false,
      warnings: ["Warning one.", "Warning two."]
    });

    const result = getTournamentFormDisplayState(adj);
    expect(result.status).toBe("not_applied");
    if (result.status !== "not_applied") return;
    expect(result.warnings).toHaveLength(2);
  });

  test("applied state with cutoffAt preserves cutoff metadata", () => {
    const adj = makeAppliedAdj({ cutoffAt: "2026-06-18T10:00:00.000Z" });
    const result = getTournamentFormDisplayState(adj);

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.adj.cutoffAt).toBe("2026-06-18T10:00:00.000Z");
  });
});
