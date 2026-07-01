// Server-only module. Do not import from client components or client barrels.
//
// Static import lets webpack bundle the JSON content directly into the server
// bundle at build time. The runtime never calls readFileSync or resolves a
// dynamic path, so Vercel Lambda deployments work regardless of how
// import.meta.url resolves inside the container.
import selectedCandidateJson from "../../../../docs/model-results/artifacts/attack-defense-recalibration-selected-candidate.json" with { type: "json" };

// Typed as unknown so consumers must validate before use. Validation is
// performed by the existing readiness and activation-gate logic inside
// createAttackDefenseProductionDependencies.
export const embeddedAttackDefenseSelectedCandidateArtifact: unknown =
  selectedCandidateJson as unknown;
