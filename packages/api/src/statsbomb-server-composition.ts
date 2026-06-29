import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createArtifactTeamPerformanceProfileSource } from "./statsbomb-artifact-profile-source.js";
import type { TeamPerformanceProfileSource } from "./statsbomb-prediction-signal.js";

const __serverCompDir = dirname(fileURLToPath(import.meta.url));

export const STATSBOMB_PROFILES_ARTIFACT_PATH = join(
  __serverCompDir,
  "../../../docs/model-results/artifacts/statsbomb-team-performance-profiles.json"
);

export function createDefaultStatsBombProfileSource(): TeamPerformanceProfileSource {
  return createArtifactTeamPerformanceProfileSource(STATSBOMB_PROFILES_ARTIFACT_PATH);
}
