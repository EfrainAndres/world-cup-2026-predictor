/**
 * Phase 12.11D artifact integration test.
 *
 * Loads the V2 candidate evaluation artifact from Phase 12.11C, runs the
 * production decision evaluator, validates invariants, and writes the
 * structured decision artifact to
 * docs/model-results/artifacts/elo-to-xg-v2-production-decision.json.
 *
 * Run with: pnpm --filter @world-cup-2026-predictor/model calibration:v2-decision
 * Or as part of the full test suite: pnpm --filter @world-cup-2026-predictor/model test
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluateCandidateProductionDecision,
  verifyV1ProductionConstantsUnchangedForDecision,
  V2_PRODUCTION_DECISION_VERSION
} from "../src/elo-to-xg-v2-production-decision.js";
import type { V2CandidateReport } from "../src/elo-to-xg-v2-candidate.js";

function loadCandidateReport(): V2CandidateReport {
  const url = new URL(
    "../../../docs/model-results/artifacts/elo-to-xg-v2-steeper-linear-candidate-summary.json",
    import.meta.url
  );
  return JSON.parse(readFileSync(url, "utf8")) as V2CandidateReport;
}

describe("elo-to-xg v2 production decision artifact integration", () => {
  const report = loadCandidateReport();

  it("loads candidate report with 3 evaluations", () => {
    expect(report.evaluations).toHaveLength(3);
  });

  it("all Phase 12.11C candidates are eligible_for_review", () => {
    for (const ev of report.evaluations) {
      expect(ev.acceptance_gate.verdict).toBe("eligible_for_review");
    }
  });

  it("V1 production constants are unchanged", () => {
    const constants = verifyV1ProductionConstantsUnchangedForDecision();
    expect(constants.adjustmentPer100).toBe(0.1);
    expect(constants.maxAdjustment).toBe(0.45);
    expect(constants.baseGoals).toBe(1.25);
    expect(constants.unchanged).toBe(true);
  });

  it("evaluates and returns a decision", () => {
    const result = evaluateCandidateProductionDecision({ report });
    const validDecisions = ["promote_to_production", "continue_experimentation", "reject"];
    expect(validDecisions).toContain(result.decision);
  });

  it("decision_version is set correctly", () => {
    const result = evaluateCandidateProductionDecision({ report });
    expect(result.decision_version).toBe(V2_PRODUCTION_DECISION_VERSION);
  });

  it("candidates_reviewed lists all three candidates", () => {
    const result = evaluateCandidateProductionDecision({ report });
    expect(result.candidates_reviewed).toContain("steeper-0.13");
    expect(result.candidates_reviewed).toContain("steeper-0.15");
    expect(result.candidates_reviewed).toContain("steeper-0.17");
  });

  it("selected_candidate_id is set when decision is promote_to_production", () => {
    const result = evaluateCandidateProductionDecision({ report });
    if (result.decision === "promote_to_production") {
      expect(result.selected_candidate_id).not.toBeNull();
      expect(typeof result.selected_candidate_id).toBe("string");
    }
  });

  it("rationale is non-empty", () => {
    const result = evaluateCandidateProductionDecision({ report });
    expect(result.rationale.length).toBeGreaterThan(0);
  });

  it("rollback_criteria is non-empty", () => {
    const result = evaluateCandidateProductionDecision({ report });
    expect(result.rollback_criteria.length).toBeGreaterThan(0);
  });

  it("production_guardrails is non-empty", () => {
    const result = evaluateCandidateProductionDecision({ report });
    expect(result.production_guardrails.length).toBeGreaterThan(0);
  });

  it("unresolved_risks is non-empty", () => {
    const result = evaluateCandidateProductionDecision({ report });
    expect(result.unresolved_risks.length).toBeGreaterThan(0);
  });

  it("acceptance_checks all have required fields", () => {
    const result = evaluateCandidateProductionDecision({ report });
    for (const check of result.acceptance_checks) {
      expect(typeof check.name).toBe("string");
      expect(check.name.length).toBeGreaterThan(0);
      expect(typeof check.passed).toBe("boolean");
      expect(typeof check.detail).toBe("string");
      expect(check.detail.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic across two runs", () => {
    const r1 = evaluateCandidateProductionDecision({ report });
    const r2 = evaluateCandidateProductionDecision({ report });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("generates and writes the artifact file", () => {
    const result = evaluateCandidateProductionDecision({ report });
    const constants = verifyV1ProductionConstantsUnchangedForDecision();

    const artifact = {
      schema_version: "1",
      decision_version: result.decision_version,
      decision: result.decision,
      selected_candidate_id: result.selected_candidate_id,
      candidates_reviewed: result.candidates_reviewed,
      v1_reference: report.v1_reference,
      v1_production_constants: constants,
      rationale: result.rationale,
      acceptance_checks: result.acceptance_checks,
      risks: result.risks,
      rollback_criteria: result.rollback_criteria,
      production_guardrails: result.production_guardrails,
      sample_size_warnings: result.sample_size_warnings,
      unresolved_risks: result.unresolved_risks
    };

    const artifactDir = new URL("../../../docs/model-results/artifacts/", import.meta.url);
    const artifactPath = new URL("elo-to-xg-v2-production-decision.json", artifactDir);

    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");

    const readBack = JSON.parse(readFileSync(artifactPath, "utf8")) as typeof artifact;
    expect(readBack.schema_version).toBe("1");
    expect(readBack.decision_version).toBe(result.decision_version);
    expect(readBack.decision).toBe(result.decision);
    expect(readBack.candidates_reviewed).toHaveLength(3);
  });
});
