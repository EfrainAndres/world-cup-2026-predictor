// Server-only module. Do not import from client components or client barrels.
//
// Static imports let webpack bundle the JSON content directly into the server
// bundle at build time.  The runtime never calls readFileSync or resolves a
// dynamic path, so Vercel Lambda deployments work regardless of how
// import.meta.url resolves inside the container.
import profilesJson from "../../../../docs/model-results/artifacts/statsbomb-team-performance-profiles.json";
import backtestJson from "../../../../docs/model-results/artifacts/statsbomb-backtesting-expanded-elo.json";

// Typed as unknown so consumers must validate before use.  Validation is
// performed by the existing readiness and activation-gate logic inside
// createProductionPredictionDependencies.
export const embeddedProfilesArtifact: unknown = profilesJson as unknown;
export const embeddedBacktestArtifact: unknown = backtestJson as unknown;
