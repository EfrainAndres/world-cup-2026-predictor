export interface PredictionXgGuardrailConfig {
  maxIndividualXg: number;
  maxTotalXg: number;
  maxStageDelta: number;
  probabilitySumTolerance: number;
}

export const DEFAULT_GUARDRAIL_CONFIG: PredictionXgGuardrailConfig = {
  maxIndividualXg: 6.0,
  maxTotalXg: 9.0,
  maxStageDelta: 3.0,
  probabilitySumTolerance: 0.001,
};

export type GuardrailViolationCode =
  | "guardrail_non_finite_xg"
  | "guardrail_negative_xg"
  | "guardrail_individual_xg_exceeded"
  | "guardrail_total_xg_exceeded"
  | "guardrail_stage_delta_exceeded"
  | "guardrail_probability_invalid"
  | "guardrail_probability_sum_invalid"
  | "guardrail_artifact_fingerprint_mismatch"
  | "guardrail_candidate_mismatch"
  | "guardrail_sample_size_invalid";

export interface XgGuardrailResult {
  valid: boolean;
  violations: string[];
  fallbackApplied: boolean;
  fallbackSource: "previous_stage" | "elo_v2" | null;
  safeXg: { home: number; away: number };
  /** Sanitized code for the first violation, null when valid. */
  primaryViolationCode: GuardrailViolationCode | null;
}

export interface ProbabilityGuardrailResult {
  valid: boolean;
  violations: string[];
  primaryViolationCode: GuardrailViolationCode | null;
}

export interface ArtifactGuardrailResult {
  valid: boolean;
  violations: string[];
}

export interface ArtifactGuardrailIssue {
  code: GuardrailViolationCode;
  message: string;
}

function isFiniteNonNegative(v: number): boolean {
  return isFinite(v) && v >= 0;
}

export function validateXgValues(
  candidate: { home: number; away: number },
  fallback: { home: number; away: number },
  config: PredictionXgGuardrailConfig,
  stageLabel: string
): XgGuardrailResult {
  const violations: string[] = [];
  let primaryViolationCode: GuardrailViolationCode | null = null;

  function addViolation(msg: string, code: GuardrailViolationCode): void {
    violations.push(msg);
    if (primaryViolationCode === null) primaryViolationCode = code;
  }

  if (!isFiniteNonNegative(candidate.home)) {
    const code: GuardrailViolationCode =
      isFinite(candidate.home) && candidate.home < 0 ? "guardrail_negative_xg" : "guardrail_non_finite_xg";
    addViolation(`${stageLabel}: home xG is not a finite non-negative number (${candidate.home})`, code);
  } else if (candidate.home > config.maxIndividualXg) {
    addViolation(
      `${stageLabel}: home xG exceeds maximum individual (${candidate.home} > ${config.maxIndividualXg})`,
      "guardrail_individual_xg_exceeded"
    );
  }

  if (!isFiniteNonNegative(candidate.away)) {
    const code: GuardrailViolationCode =
      isFinite(candidate.away) && candidate.away < 0 ? "guardrail_negative_xg" : "guardrail_non_finite_xg";
    addViolation(`${stageLabel}: away xG is not a finite non-negative number (${candidate.away})`, code);
  } else if (candidate.away > config.maxIndividualXg) {
    addViolation(
      `${stageLabel}: away xG exceeds maximum individual (${candidate.away} > ${config.maxIndividualXg})`,
      "guardrail_individual_xg_exceeded"
    );
  }

  if (violations.length === 0) {
    const total = candidate.home + candidate.away;
    if (total > config.maxTotalXg) {
      addViolation(
        `${stageLabel}: total xG (${total.toFixed(3)}) exceeds maximum (${config.maxTotalXg})`,
        "guardrail_total_xg_exceeded"
      );
    }

    const homeDelta = Math.abs(candidate.home - fallback.home);
    const awayDelta = Math.abs(candidate.away - fallback.away);
    if (homeDelta > config.maxStageDelta) {
      addViolation(
        `${stageLabel}: home xG stage delta (${homeDelta.toFixed(3)}) exceeds maximum (${config.maxStageDelta})`,
        "guardrail_stage_delta_exceeded"
      );
    }
    if (awayDelta > config.maxStageDelta) {
      addViolation(
        `${stageLabel}: away xG stage delta (${awayDelta.toFixed(3)}) exceeds maximum (${config.maxStageDelta})`,
        "guardrail_stage_delta_exceeded"
      );
    }
  }

  const fallbackApplied = violations.length > 0;
  return {
    valid: !fallbackApplied,
    violations,
    fallbackApplied,
    fallbackSource: fallbackApplied ? "previous_stage" : null,
    safeXg: fallbackApplied ? fallback : candidate,
    primaryViolationCode,
  };
}

export function validateProbabilities(
  probs: { homeWin: number; draw: number; awayWin: number },
  config: PredictionXgGuardrailConfig,
  label: string
): ProbabilityGuardrailResult {
  const violations: string[] = [];
  let primaryViolationCode: GuardrailViolationCode | null = null;

  function addViolation(msg: string, code: GuardrailViolationCode): void {
    violations.push(msg);
    if (primaryViolationCode === null) primaryViolationCode = code;
  }

  const entries: Array<[string, number]> = [
    ["homeWin", probs.homeWin],
    ["draw", probs.draw],
    ["awayWin", probs.awayWin],
  ];

  for (const [name, v] of entries) {
    if (!isFinite(v) || isNaN(v)) {
      addViolation(`${label}: ${name} probability is not finite (${v})`, "guardrail_probability_invalid");
    } else if (v < 0 || v > 1) {
      addViolation(
        `${label}: ${name} probability out of range [0,1] (${v.toFixed(6)})`,
        "guardrail_probability_invalid"
      );
    }
  }

  if (violations.length === 0) {
    const sum = probs.homeWin + probs.draw + probs.awayWin;
    if (Math.abs(sum - 1.0) > config.probabilitySumTolerance) {
      addViolation(
        `${label}: probability sum deviates from 1.0 by ${Math.abs(sum - 1.0).toFixed(6)} (tolerance ${config.probabilitySumTolerance})`,
        "guardrail_probability_sum_invalid"
      );
    }
  }

  return { valid: violations.length === 0, violations, primaryViolationCode };
}

export function validateArtifactFingerprint(
  expectedFingerprint: string,
  actualFingerprint: string,
  candidateId: string,
  expectedCandidateId: string,
  label: string
): ArtifactGuardrailResult {
  const violations: string[] = [];
  if (actualFingerprint !== expectedFingerprint) {
    violations.push(`${label}: artifact fingerprint mismatch`);
  }
  if (candidateId !== expectedCandidateId) {
    violations.push(`${label}: candidate ID mismatch`);
  }
  return { valid: violations.length === 0, violations };
}

export function validateSampleSizes(
  homeCount: number,
  awayCount: number,
  minSample: number,
  label: string
): string[] {
  const warnings: string[] = [];
  if (homeCount < minSample) {
    warnings.push(`${label}: home team sample size below minimum (${homeCount} < ${minSample})`);
  }
  if (awayCount < minSample) {
    warnings.push(`${label}: away team sample size below minimum (${awayCount} < ${minSample})`);
  }
  return warnings;
}

export function checkArtifactCandidate(
  actualCandidateId: string,
  expectedCandidateId: string,
  label: string
): ArtifactGuardrailIssue | null {
  if (actualCandidateId !== expectedCandidateId) {
    return {
      code: "guardrail_candidate_mismatch",
      message: `${label}: candidate ID mismatch (expected ${expectedCandidateId}, got ${actualCandidateId})`,
    };
  }
  return null;
}

export function checkArtifactFingerprint(
  actualFingerprint: string,
  expectedFingerprint: string,
  label: string
): ArtifactGuardrailIssue | null {
  if (actualFingerprint !== expectedFingerprint) {
    return {
      code: "guardrail_artifact_fingerprint_mismatch",
      message: `${label}: artifact fingerprint mismatch`,
    };
  }
  return null;
}

export function checkProfileSampleSizes(
  homeSampleSize: number,
  awaySampleSize: number,
  minSample: number,
  label: string
): ArtifactGuardrailIssue | null {
  if (homeSampleSize < minSample || awaySampleSize < minSample) {
    return {
      code: "guardrail_sample_size_invalid",
      message: `${label}: sample size below minimum (home=${homeSampleSize}, away=${awaySampleSize}, min=${minSample})`,
    };
  }
  return null;
}
