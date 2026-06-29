import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createArtifactTeamPerformanceProfileSource, createInMemoryTeamPerformanceProfileSource } from "./statsbomb-artifact-profile-source.js";
import type { TeamPerformanceProfileSource } from "./statsbomb-prediction-signal.js";
import {
  evaluateStatsBombProductionActivationGate,
  parseStatsBombRolloutMode,
  validateStatsBombProductionArtifact
} from "./statsbomb-production-config.js";
import type {
  StatsBombActivationDecision,
  StatsBombProductionReadiness,
  StatsBombRolloutMode,
  StatsBombRuntimeDiagnostics
} from "./statsbomb-production-config.js";

const __serverCompDir = dirname(fileURLToPath(import.meta.url));
const FAILED_LOAD_RETRY_MS = 30_000;

export const STATSBOMB_PROFILES_ARTIFACT_PATH = join(
  __serverCompDir,
  "../../../docs/model-results/artifacts/statsbomb-team-performance-profiles.json"
);

export const STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH = join(
  __serverCompDir,
  "../../../docs/model-results/artifacts/statsbomb-backtesting-expanded-elo.json"
);

export function createDefaultStatsBombProfileSource(): TeamPerformanceProfileSource {
  return createArtifactTeamPerformanceProfileSource(STATSBOMB_PROFILES_ARTIFACT_PATH);
}

export interface ProductionPredictionDependencies {
  statsBombProfileSource?: TeamPerformanceProfileSource;
  statsBombSignalMode: StatsBombRolloutMode;
  statsBombReadiness: StatsBombProductionReadiness;
  statsBombActivationDecision: StatsBombActivationDecision;
  statsBombDiagnostics: StatsBombRuntimeDiagnostics;
}

interface CachedArtifactLoad {
  loadedAtMs: number;
  lastLoadStatus: "loaded" | "failed";
  readiness: StatsBombProductionReadiness;
  profileSource?: TeamPerformanceProfileSource;
}

let cachedArtifactLoad: CachedArtifactLoad | null = null;

export function resetStatsBombProductionCache(): void {
  cachedArtifactLoad = null;
}

function readJsonFile(path: string, readFile: (path: string) => string): unknown {
  return JSON.parse(readFile(path));
}

function loadBacktestDecision(readFile: (path: string) => string): {
  backtestDecision: string | null;
  dataQualityDecision: string | null;
} {
  try {
    const parsed = readJsonFile(STATSBOMB_BACKTESTING_EXPANDED_ELO_ARTIFACT_PATH, readFile);
    if (typeof parsed !== "object" || parsed === null) {
      return { backtestDecision: null, dataQualityDecision: null };
    }
    const value = parsed as Record<string, unknown>;
    const strategies = Array.isArray(value["strategies"]) ? value["strategies"] : [];
    const firstStrategy = strategies[0];
    const statsBombDecision =
      typeof firstStrategy === "object" && firstStrategy !== null
        ? (firstStrategy as Record<string, unknown>)["statsBombDecision"]
        : undefined;
    const backtestDecision =
      typeof statsBombDecision === "object" && statsBombDecision !== null
        ? (statsBombDecision as Record<string, unknown>)["decision"]
        : undefined;
    const dataQualityDecision =
      typeof value["dataQualityDecision"] === "object" && value["dataQualityDecision"] !== null
        ? (value["dataQualityDecision"] as Record<string, unknown>)["decision"]
        : undefined;

    return {
      backtestDecision: typeof backtestDecision === "string" ? backtestDecision : null,
      dataQualityDecision: typeof dataQualityDecision === "string" ? dataQualityDecision : null
    };
  } catch {
    return { backtestDecision: null, dataQualityDecision: null };
  }
}

function loadProfileArtifact(input: {
  now: string;
  readFile: (path: string) => string;
  nowMs: number;
}): CachedArtifactLoad {
  if (cachedArtifactLoad !== null) {
    if (
      cachedArtifactLoad.lastLoadStatus === "loaded" ||
      input.nowMs - cachedArtifactLoad.loadedAtMs < FAILED_LOAD_RETRY_MS
    ) {
      return cachedArtifactLoad;
    }
  }

  try {
    let parsed: unknown;
    try {
      parsed = readJsonFile(STATSBOMB_PROFILES_ARTIFACT_PATH, input.readFile);
    } catch (error) {
      const reason =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "ENOENT"
          ? "artifact_missing"
          : "artifact_unreadable";
      const load: CachedArtifactLoad = {
        loadedAtMs: input.nowMs,
        lastLoadStatus: "failed",
        readiness: { ready: false, reason }
      };
      cachedArtifactLoad = load;
      return load;
    }

    const validation = validateStatsBombProductionArtifact(parsed, input.now);
    const load: CachedArtifactLoad = {
      loadedAtMs: input.nowMs,
      lastLoadStatus: validation.readiness.ready ? "loaded" : "failed",
      readiness: validation.readiness,
      ...(validation.readiness.ready
        ? { profileSource: createInMemoryTeamPerformanceProfileSource(validation.profiles) }
        : {})
    };
    cachedArtifactLoad = load;
    return load;
  } catch {
    const load: CachedArtifactLoad = {
      loadedAtMs: input.nowMs,
      lastLoadStatus: "failed",
      readiness: { ready: false, reason: "artifact_unreadable" }
    };
    cachedArtifactLoad = load;
    return load;
  }
}

export function createProductionPredictionDependencies(input: {
  env?: Record<string, string | undefined>;
  now?: string;
  readFile?: (path: string) => string;
} = {}): ProductionPredictionDependencies {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const readFile = input.readFile ?? ((path: string) => readFileSync(path, "utf8"));
  const mode = parseStatsBombRolloutMode(
    env["STATSBOMB_PREDICTION_SIGNAL_MODE"],
    env["STATSBOMB_PREDICTION_SIGNAL_ENABLED"]
  );

  if (mode === "off") {
    const readiness: StatsBombProductionReadiness = { ready: false, reason: "feature_disabled" };
    return {
      statsBombSignalMode: "off",
      statsBombReadiness: readiness,
      statsBombActivationDecision: "disabled",
      statsBombDiagnostics: {
        featureEnabled: false,
        rolloutMode: "off",
        activationDecision: "disabled",
        artifactReady: false,
        readinessReason: "feature_disabled",
        profileCount: null,
        artifactCutoffAt: null,
        artifactGeneratedAt: null,
        lastLoadStatus: "not_attempted"
      }
    };
  }

  const artifactLoad = loadProfileArtifact({
    now,
    readFile,
    nowMs: Number.isFinite(nowMs) ? nowMs : Date.now()
  });
  const validationDecision = loadBacktestDecision(readFile);
  const activationDecision = evaluateStatsBombProductionActivationGate({
    mode,
    readiness: artifactLoad.readiness,
    backtestDecision: validationDecision.backtestDecision,
    dataQualityDecision: validationDecision.dataQualityDecision
  });

  const effectiveMode: StatsBombRolloutMode =
    activationDecision === "production_ready"
      ? "on"
      : activationDecision === "shadow_ready"
        ? "shadow"
        : mode;

  const diagnostics: StatsBombRuntimeDiagnostics = {
    featureEnabled: true,
    rolloutMode: mode,
    activationDecision,
    artifactReady: artifactLoad.readiness.ready,
    readinessReason: artifactLoad.readiness.ready ? "ready" : artifactLoad.readiness.reason,
    profileCount: artifactLoad.readiness.ready ? artifactLoad.readiness.profileCount : null,
    artifactCutoffAt: artifactLoad.readiness.ready ? artifactLoad.readiness.cutoffAt : null,
    artifactGeneratedAt: artifactLoad.readiness.ready ? artifactLoad.readiness.generatedAt : null,
    lastLoadStatus: artifactLoad.lastLoadStatus
  };

  return {
    ...(artifactLoad.profileSource === undefined ? {} : { statsBombProfileSource: artifactLoad.profileSource }),
    statsBombSignalMode: effectiveMode,
    statsBombReadiness: artifactLoad.readiness,
    statsBombActivationDecision: activationDecision,
    statsBombDiagnostics: diagnostics
  };
}
