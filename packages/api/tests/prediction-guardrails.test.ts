import { describe, test, expect } from "vitest";
import {
  validateXgValues,
  validateProbabilities,
  validateArtifactFingerprint,
  validateSampleSizes,
  checkArtifactCandidate,
  checkArtifactFingerprint,
  checkProfileSampleSizes,
  DEFAULT_GUARDRAIL_CONFIG,
} from "../src/prediction-guardrails.js";

const FALLBACK = { home: 1.4, away: 1.1 };
const VALID_CANDIDATE = { home: 1.5, away: 1.0 };

describe("validateXgValues — valid inputs", () => {
  test("valid xG values pass through unchanged", () => {
    const result = validateXgValues(VALID_CANDIDATE, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "test");
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.fallbackApplied).toBe(false);
    expect(result.fallbackSource).toBeNull();
    expect(result.safeXg).toEqual(VALID_CANDIDATE);
  });

  test("xG values at exactly the individual maximum pass", () => {
    const fallback = { home: 5.5, away: 1.0 };
    const candidate = { home: 6.0, away: 1.0 };
    const result = validateXgValues(candidate, fallback, DEFAULT_GUARDRAIL_CONFIG, "test");
    expect(result.valid).toBe(true);
  });

  test("xG values of zero pass (valid edge case)", () => {
    const candidate = { home: 0, away: 0 };
    const result = validateXgValues(candidate, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "test");
    expect(result.valid).toBe(true);
  });
});

describe("validateXgValues — NaN and Infinity", () => {
  test("NaN home xG triggers fallback", () => {
    const result = validateXgValues({ home: NaN, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.safeXg).toEqual(FALLBACK);
    expect(result.violations.some((v) => v.includes("home xG"))).toBe(true);
  });

  test("Infinity away xG triggers fallback", () => {
    const result = validateXgValues({ home: 1.0, away: Infinity }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.safeXg).toEqual(FALLBACK);
    expect(result.violations.some((v) => v.includes("away xG"))).toBe(true);
  });

  test("-Infinity home xG triggers fallback", () => {
    const result = validateXgValues({ home: -Infinity, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
  });
});

describe("validateXgValues — negative values", () => {
  test("negative home xG triggers fallback", () => {
    const result = validateXgValues({ home: -0.1, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.safeXg).toEqual(FALLBACK);
  });

  test("negative away xG triggers fallback", () => {
    const result = validateXgValues({ home: 1.0, away: -0.5 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
  });
});

describe("validateXgValues — maximum individual threshold", () => {
  test("home xG exceeding maxIndividualXg triggers fallback", () => {
    const result = validateXgValues({ home: 6.01, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.violations.some((v) => v.includes("exceeds maximum individual"))).toBe(true);
  });

  test("away xG exceeding maxIndividualXg triggers fallback", () => {
    const result = validateXgValues({ home: 1.0, away: 7.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
  });
});

describe("validateXgValues — maximum total threshold", () => {
  test("total xG exceeding maxTotalXg triggers fallback", () => {
    const result = validateXgValues({ home: 5.0, away: 4.5 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.violations.some((v) => v.includes("total xG"))).toBe(true);
  });
});

describe("validateXgValues — maximum stage delta", () => {
  test("home xG delta exceeding maxStageDelta triggers fallback", () => {
    const candidate = { home: FALLBACK.home + 3.01, away: FALLBACK.away };
    const result = validateXgValues(candidate, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.violations.some((v) => v.includes("stage delta"))).toBe(true);
  });

  test("away xG delta exceeding maxStageDelta triggers fallback", () => {
    const candidate = { home: FALLBACK.home, away: FALLBACK.away + 3.01 };
    const result = validateXgValues(candidate, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
  });

  test("delta exactly at maxStageDelta passes", () => {
    const fallback = { home: 1.0, away: 1.0 };
    const candidate = { home: 4.0, away: 1.0 };
    const result = validateXgValues(candidate, fallback, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.valid).toBe(true);
  });
});

describe("validateXgValues — fallbackSource", () => {
  test("fallbackSource is previous_stage when fallback applied", () => {
    const result = validateXgValues({ home: NaN, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.fallbackSource).toBe("previous_stage");
  });

  test("fallbackSource is null when no violation", () => {
    const result = validateXgValues(VALID_CANDIDATE, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.fallbackSource).toBeNull();
  });
});

describe("validateProbabilities", () => {
  test("valid probabilities pass", () => {
    const result = validateProbabilities(
      { homeWin: 0.5, draw: 0.25, awayWin: 0.25 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test("probability sum deviation beyond tolerance fails", () => {
    const result = validateProbabilities(
      { homeWin: 0.5, draw: 0.3, awayWin: 0.3 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("probability sum"))).toBe(true);
  });

  test("negative probability fails", () => {
    const result = validateProbabilities(
      { homeWin: -0.1, draw: 0.5, awayWin: 0.6 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("homeWin"))).toBe(true);
  });

  test("probability > 1 fails", () => {
    const result = validateProbabilities(
      { homeWin: 1.1, draw: 0.0, awayWin: 0.0 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.valid).toBe(false);
  });

  test("NaN probability fails", () => {
    const result = validateProbabilities(
      { homeWin: NaN, draw: 0.5, awayWin: 0.5 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("not finite"))).toBe(true);
  });
});

describe("validateArtifactFingerprint", () => {
  test("matching fingerprint and candidateId passes", () => {
    const result = validateArtifactFingerprint("sha256:abc", "sha256:abc", "cand_1", "cand_1", "artifact");
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test("fingerprint mismatch fails", () => {
    const result = validateArtifactFingerprint("sha256:abc", "sha256:xyz", "cand_1", "cand_1", "artifact");
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("fingerprint mismatch"))).toBe(true);
  });

  test("candidateId mismatch fails", () => {
    const result = validateArtifactFingerprint("sha256:abc", "sha256:abc", "cand_1", "cand_2", "artifact");
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes("candidate ID mismatch"))).toBe(true);
  });

  test("both mismatch produces two violations", () => {
    const result = validateArtifactFingerprint("sha256:abc", "sha256:xyz", "cand_1", "cand_2", "artifact");
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(2);
  });
});

describe("validateSampleSizes", () => {
  test("both teams above minimum returns empty warnings", () => {
    const warnings = validateSampleSizes(10, 8, 5, "ad");
    expect(warnings).toHaveLength(0);
  });

  test("home team below minimum produces a warning", () => {
    const warnings = validateSampleSizes(3, 8, 5, "ad");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("home team sample size below minimum");
  });

  test("away team below minimum produces a warning", () => {
    const warnings = validateSampleSizes(10, 2, 5, "ad");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("away team sample size below minimum");
  });

  test("both teams below minimum produces two warnings", () => {
    const warnings = validateSampleSizes(1, 2, 5, "ad");
    expect(warnings).toHaveLength(2);
  });
});

describe("validateXgValues — primaryViolationCode", () => {
  test("null when valid", () => {
    const result = validateXgValues(VALID_CANDIDATE, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.primaryViolationCode).toBeNull();
  });

  test("guardrail_non_finite_xg when NaN", () => {
    const result = validateXgValues({ home: NaN, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.primaryViolationCode).toBe("guardrail_non_finite_xg");
  });

  test("guardrail_non_finite_xg when Infinity", () => {
    const result = validateXgValues({ home: Infinity, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.primaryViolationCode).toBe("guardrail_non_finite_xg");
  });

  test("guardrail_negative_xg when negative", () => {
    const result = validateXgValues({ home: -0.5, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.primaryViolationCode).toBe("guardrail_negative_xg");
  });

  test("guardrail_individual_xg_exceeded when over max", () => {
    const result = validateXgValues({ home: 7.0, away: 1.0 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.primaryViolationCode).toBe("guardrail_individual_xg_exceeded");
  });

  test("guardrail_stage_delta_exceeded when delta too large", () => {
    const candidate = { home: FALLBACK.home + 3.5, away: FALLBACK.away };
    const result = validateXgValues(candidate, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.primaryViolationCode).toBe("guardrail_stage_delta_exceeded");
  });

  test("guardrail_total_xg_exceeded when total too high", () => {
    const result = validateXgValues({ home: 5.0, away: 4.5 }, FALLBACK, DEFAULT_GUARDRAIL_CONFIG, "stage_x");
    expect(result.primaryViolationCode).toBe("guardrail_total_xg_exceeded");
  });
});

describe("checkArtifactCandidate", () => {
  test("returns null when candidate IDs match", () => {
    const result = checkArtifactCandidate("candidate_v1", "candidate_v1", "test");
    expect(result).toBeNull();
  });

  test("returns guardrail_candidate_mismatch when IDs differ", () => {
    const result = checkArtifactCandidate("candidate_v2", "candidate_v1", "test");
    expect(result).not.toBeNull();
    expect(result?.code).toBe("guardrail_candidate_mismatch");
    expect(result?.message).toContain("candidate ID mismatch");
  });
});

describe("checkArtifactFingerprint", () => {
  test("returns null when fingerprints match", () => {
    const result = checkArtifactFingerprint("sha256:abc", "sha256:abc", "test");
    expect(result).toBeNull();
  });

  test("returns guardrail_artifact_fingerprint_mismatch when fingerprints differ", () => {
    const result = checkArtifactFingerprint("sha256:abc", "sha256:xyz", "test");
    expect(result).not.toBeNull();
    expect(result?.code).toBe("guardrail_artifact_fingerprint_mismatch");
  });
});

describe("checkProfileSampleSizes", () => {
  test("returns null when both samples are above minimum", () => {
    const result = checkProfileSampleSizes(10, 8, 3, "test");
    expect(result).toBeNull();
  });

  test("returns null when samples equal minimum", () => {
    const result = checkProfileSampleSizes(3, 3, 3, "test");
    expect(result).toBeNull();
  });

  test("returns guardrail_sample_size_invalid when home below minimum", () => {
    const result = checkProfileSampleSizes(2, 8, 3, "test");
    expect(result).not.toBeNull();
    expect(result?.code).toBe("guardrail_sample_size_invalid");
  });

  test("returns guardrail_sample_size_invalid when away below minimum", () => {
    const result = checkProfileSampleSizes(8, 1, 3, "test");
    expect(result).not.toBeNull();
    expect(result?.code).toBe("guardrail_sample_size_invalid");
  });
});

describe("validateProbabilities — primaryViolationCode", () => {
  test("null when valid", () => {
    const result = validateProbabilities(
      { homeWin: 0.5, draw: 0.25, awayWin: 0.25 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.primaryViolationCode).toBeNull();
  });

  test("guardrail_probability_invalid when NaN", () => {
    const result = validateProbabilities(
      { homeWin: NaN, draw: 0.5, awayWin: 0.5 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.primaryViolationCode).toBe("guardrail_probability_invalid");
  });

  test("guardrail_probability_invalid when out of range", () => {
    const result = validateProbabilities(
      { homeWin: 1.5, draw: 0.0, awayWin: 0.0 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.primaryViolationCode).toBe("guardrail_probability_invalid");
  });

  test("guardrail_probability_sum_invalid when sum deviates", () => {
    const result = validateProbabilities(
      { homeWin: 0.5, draw: 0.3, awayWin: 0.3 },
      DEFAULT_GUARDRAIL_CONFIG,
      "probs"
    );
    expect(result.primaryViolationCode).toBe("guardrail_probability_sum_invalid");
  });
});
