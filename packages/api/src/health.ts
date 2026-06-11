import { buildApiMetadata } from "./schemas.js";
import type { HealthResponse } from "./schemas.js";

export function getHealth(): HealthResponse {
  return {
    status: "ok",
    service: "world-cup-2026-predictor-api",
    version: "0.1.0",
    metadata: buildApiMetadata(["Pure handler foundation only; no HTTP server is started in Phase 5.0."])
  };
}
