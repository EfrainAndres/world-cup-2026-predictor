import { describe, it, expect } from "vitest";
import {
  deriveEvidenceStateKind,
  formatEvidenceCount,
  formatEvidenceDecimal,
  formatEvidenceGoals,
  formatEvidencePercent,
  formatSampleSize,
  getConfidenceLevelPresentation,
  getCoverageTypePresentation,
  getEvidenceProgress,
  getEvidenceState,
  getModelVersionLabel,
  getProductionModelConfig,
  getRecalibrationProgress,
  getVerdictPresentation
} from "./model-evidence-center";
import type { LiveEvidenceGateDecision } from "@world-cup-2026-predictor/api";

// ---------------------------------------------------------------------------
// deriveEvidenceStateKind
// ---------------------------------------------------------------------------

describe("deriveEvidenceStateKind", () => {
  it("returns persistence_error when persistenceError is true", () => {
    expect(deriveEvidenceStateKind(true, true, 10, 5, "evidence_collection_continue")).toBe(
      "persistence_error"
    );
  });

  it("returns no_persistence_configured when not configured and no error", () => {
    expect(deriveEvidenceStateKind(false, false, 0, 0, null)).toBe("no_persistence_configured");
  });

  it("returns no_evidence when snapshotCount is 0", () => {
    expect(deriveEvidenceStateKind(true, false, 0, 0, null)).toBe("no_evidence");
  });

  it("returns no_evidence when evaluationCount is 0 with snapshots", () => {
    expect(deriveEvidenceStateKind(true, false, 5, 0, null)).toBe("no_evidence");
  });

  it("returns insufficient when gate decision is insufficient_evidence", () => {
    expect(deriveEvidenceStateKind(true, false, 5, 3, "insufficient_evidence")).toBe("insufficient");
  });

  it("returns data_quality_blocked when gate decision matches", () => {
    expect(deriveEvidenceStateKind(true, false, 10, 8, "data_quality_blocked")).toBe(
      "data_quality_blocked"
    );
  });

  it("returns usable for normal evidence_collection_continue state", () => {
    expect(deriveEvidenceStateKind(true, false, 10, 9, "evidence_collection_continue")).toBe(
      "usable"
    );
  });

  it("returns usable for presentation_change_only", () => {
    expect(deriveEvidenceStateKind(true, false, 30, 25, "presentation_change_only")).toBe("usable");
  });

  it("returns usable for recalibrate_elo_to_xg", () => {
    expect(deriveEvidenceStateKind(true, false, 30, 25, "recalibrate_elo_to_xg")).toBe("usable");
  });
});

// ---------------------------------------------------------------------------
// getEvidenceState
// ---------------------------------------------------------------------------

describe("getEvidenceState", () => {
  it("returns the label for each known state kind", () => {
    expect(getEvidenceState("no_persistence_configured").label).toBe("In-memory only");
    expect(getEvidenceState("persistence_error").label).toBe("Storage unavailable");
    expect(getEvidenceState("no_evidence").label).toBe("No evidence yet");
    expect(getEvidenceState("insufficient").label).toBe("Insufficient evidence");
    expect(getEvidenceState("data_quality_blocked").label).toBe("Data quality blocked");
    expect(getEvidenceState("usable").label).toBe("Evidence available");
  });

  it("state kind in return value matches argument", () => {
    const state = getEvidenceState("usable");
    expect(state.kind).toBe("usable");
  });
});

// ---------------------------------------------------------------------------
// getVerdictPresentation — all 7 decisions
// ---------------------------------------------------------------------------

describe("getVerdictPresentation", () => {
  const ALL_DECISIONS: LiveEvidenceGateDecision[] = [
    "insufficient_evidence",
    "data_quality_blocked",
    "evidence_collection_continue",
    "presentation_change_only",
    "recalibrate_scoreline_selection",
    "recalibrate_elo_to_xg",
    "broader_model_review"
  ];

  it.each(ALL_DECISIONS)("returns a presentation for decision %s", (decision) => {
    const p = getVerdictPresentation(decision);
    expect(p.decision).toBe(decision);
    expect(p.title).toBeTruthy();
    expect(p.explanation).toBeTruthy();
    expect(p.nextAction).toBeTruthy();
    expect(["neutral", "info", "warning", "success", "danger"]).toContain(p.statusVariant);
  });

  it("preserveModel is true for non-action decisions", () => {
    expect(getVerdictPresentation("insufficient_evidence").preserveModel).toBe(true);
    expect(getVerdictPresentation("data_quality_blocked").preserveModel).toBe(true);
    expect(getVerdictPresentation("evidence_collection_continue").preserveModel).toBe(true);
    expect(getVerdictPresentation("presentation_change_only").preserveModel).toBe(true);
  });

  it("preserveModel is false for recalibration decisions", () => {
    expect(getVerdictPresentation("recalibrate_scoreline_selection").preserveModel).toBe(false);
    expect(getVerdictPresentation("recalibrate_elo_to_xg").preserveModel).toBe(false);
    expect(getVerdictPresentation("broader_model_review").preserveModel).toBe(false);
  });

  it("broader_model_review has danger variant", () => {
    expect(getVerdictPresentation("broader_model_review").statusVariant).toBe("danger");
  });
});

// ---------------------------------------------------------------------------
// getConfidenceLevelPresentation
// ---------------------------------------------------------------------------

describe("getConfidenceLevelPresentation", () => {
  it("returns level labels for all four confidence levels", () => {
    expect(getConfidenceLevelPresentation("high").label).toBe("High");
    expect(getConfidenceLevelPresentation("medium").label).toBe("Medium");
    expect(getConfidenceLevelPresentation("low").label).toBe("Low");
    expect(getConfidenceLevelPresentation("very_low").label).toBe("Very low");
  });

  it("includes a non-empty note for all levels", () => {
    for (const level of ["high", "medium", "low", "very_low"] as const) {
      expect(getConfidenceLevelPresentation(level).note.length).toBeGreaterThan(0);
    }
  });

  it("level field matches input argument", () => {
    expect(getConfidenceLevelPresentation("low").level).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// getCoverageTypePresentation
// ---------------------------------------------------------------------------

describe("getCoverageTypePresentation", () => {
  it("returns label for all four coverage types", () => {
    expect(getCoverageTypePresentation("full").label).toBe("Full");
    expect(getCoverageTypePresentation("partial").label).toBe("Partial");
    expect(getCoverageTypePresentation("fallback").label).toBe("Fallback");
    expect(getCoverageTypePresentation("fallback_only").label).toBe("Fallback only");
  });

  it("type field matches input argument", () => {
    expect(getCoverageTypePresentation("partial").type).toBe("partial");
  });
});

// ---------------------------------------------------------------------------
// formatEvidencePercent
// ---------------------------------------------------------------------------

describe("formatEvidencePercent", () => {
  it("formats a fraction as a percentage", () => {
    expect(formatEvidencePercent(0.75)).toBe("75.0%");
  });

  it("returns default for null", () => {
    expect(formatEvidencePercent(null)).toBe("—");
  });

  it("returns custom default for non-finite", () => {
    expect(formatEvidencePercent(Infinity, "n/a")).toBe("n/a");
  });

  it("formats 0.0 correctly", () => {
    expect(formatEvidencePercent(0)).toBe("0.0%");
  });

  it("formats 1.0 correctly", () => {
    expect(formatEvidencePercent(1)).toBe("100.0%");
  });
});

// ---------------------------------------------------------------------------
// formatEvidenceDecimal
// ---------------------------------------------------------------------------

describe("formatEvidenceDecimal", () => {
  it("formats to 4 decimal places by default", () => {
    expect(formatEvidenceDecimal(0.12345)).toBe("0.1235");
  });

  it("respects a custom decimal places argument", () => {
    expect(formatEvidenceDecimal(0.12345, 2)).toBe("0.12");
  });

  it("returns default for null", () => {
    expect(formatEvidenceDecimal(null)).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// formatEvidenceGoals
// ---------------------------------------------------------------------------

describe("formatEvidenceGoals", () => {
  it("formats to 2 decimal places", () => {
    expect(formatEvidenceGoals(1.5)).toBe("1.50");
  });

  it("returns default for null", () => {
    expect(formatEvidenceGoals(null)).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// formatSampleSize
// ---------------------------------------------------------------------------

describe("formatSampleSize", () => {
  it("formats as n= prefix", () => {
    expect(formatSampleSize(9)).toBe("n=9");
  });

  it("handles zero", () => {
    expect(formatSampleSize(0)).toBe("n=0");
  });
});

// ---------------------------------------------------------------------------
// formatEvidenceCount
// ---------------------------------------------------------------------------

describe("formatEvidenceCount", () => {
  it("pluralizes for count > 1", () => {
    expect(formatEvidenceCount(5, "snapshot")).toBe("5 snapshots");
  });

  it("no plural for count = 1", () => {
    expect(formatEvidenceCount(1, "snapshot")).toBe("1 snapshot");
  });

  it("pluralizes for count = 0", () => {
    expect(formatEvidenceCount(0, "snapshot")).toBe("0 snapshots");
  });
});

// ---------------------------------------------------------------------------
// getEvidenceProgress
// ---------------------------------------------------------------------------

describe("getEvidenceProgress", () => {
  it("returns 0% for 0 evaluated fixtures", () => {
    const p = getEvidenceProgress(0);
    expect(p.percent).toBe(0);
    expect(p.complete).toBe(false);
  });

  it("returns 100% and complete=true at threshold", () => {
    const p = getEvidenceProgress(8);
    expect(p.percent).toBe(100);
    expect(p.complete).toBe(true);
  });

  it("caps at 100% above threshold", () => {
    const p = getEvidenceProgress(50);
    expect(p.percent).toBe(100);
  });

  it("reports partial progress correctly", () => {
    const p = getEvidenceProgress(4);
    expect(p.current).toBe(4);
    expect(p.threshold).toBe(8);
    expect(p.percent).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// getRecalibrationProgress
// ---------------------------------------------------------------------------

describe("getRecalibrationProgress", () => {
  it("threshold is 20", () => {
    const p = getRecalibrationProgress(0);
    expect(p.threshold).toBe(20);
  });

  it("returns complete=true at 20", () => {
    const p = getRecalibrationProgress(20);
    expect(p.complete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getProductionModelConfig
// ---------------------------------------------------------------------------

describe("getProductionModelConfig", () => {
  it("returns V2 formula version", () => {
    expect(getProductionModelConfig().formulaVersion).toBe("v2");
  });

  it("V2 adjustmentPer100 is 0.15", () => {
    expect(getProductionModelConfig().elo.adjustmentPer100).toBe(0.15);
  });

  it("V2 maxAdjustment is 0.65", () => {
    expect(getProductionModelConfig().elo.maxAdjustment).toBe(0.65);
  });

  it("V1 adjustmentPer100 is 0.10", () => {
    expect(getProductionModelConfig().elo.v1AdjustmentPer100).toBe(0.1);
  });

  it("V1 maxAdjustment is 0.45", () => {
    expect(getProductionModelConfig().elo.v1MaxAdjustment).toBe(0.45);
  });

  it("baseGoals is 1.25", () => {
    expect(getProductionModelConfig().elo.baseGoals).toBe(1.25);
  });

  it("minGoals is 0.2", () => {
    expect(getProductionModelConfig().elo.minGoals).toBe(0.2);
  });

  it("maxGoals is 4.0", () => {
    expect(getProductionModelConfig().elo.maxGoals).toBe(4.0);
  });

  it("Poisson matrixMaxGoals is 7", () => {
    expect(getProductionModelConfig().poisson.matrixMaxGoals).toBe(7);
  });

  it("Poisson normalizeMatrix is true", () => {
    expect(getProductionModelConfig().poisson.normalizeMatrix).toBe(true);
  });

  it("tournament form is off by default", () => {
    expect(getProductionModelConfig().tournamentFormEnabledByDefault).toBe(false);
  });

  it("tournament result adjustment is off by default", () => {
    expect(getProductionModelConfig().tournamentResultAdjustmentEnabledByDefault).toBe(false);
  });

  it("v1RollbackAvailable is true", () => {
    expect(getProductionModelConfig().elo.v1RollbackAvailable).toBe(true);
  });

  it("manualXgModeAvailable is true", () => {
    expect(getProductionModelConfig().manualXgModeAvailable).toBe(true);
  });

  it("modelVersion is non-empty string", () => {
    expect(typeof getProductionModelConfig().modelVersion).toBe("string");
    expect(getProductionModelConfig().modelVersion.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getModelVersionLabel
// ---------------------------------------------------------------------------

describe("getModelVersionLabel", () => {
  it("returns a non-empty string", () => {
    const label = getModelVersionLabel();
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });
});
