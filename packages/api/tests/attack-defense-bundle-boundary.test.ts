/**
 * Bundle boundary assertions for Phase 12.21B client/server split.
 * These tests verify that the Node.js-only profile builder is not reachable
 * through the bundle-safe import paths used by the web client.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "../../..");

function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf8");
}

describe("bundle-safe attack-defense-runtime-profile-source does not import Node built-ins", () => {
  const src = readSrc("packages/api/src/attack-defense-runtime-profile-source.ts");

  test("no node:fs import", () => {
    expect(src).not.toMatch(/from\s+['"]node:fs['"]/);
  });

  test("no node:path import", () => {
    expect(src).not.toMatch(/from\s+['"]node:path['"]/);
  });

  test("no node:url import", () => {
    expect(src).not.toMatch(/from\s+['"]node:url['"]/);
  });

  test("does not import historical-international-fixtures", () => {
    expect(src).not.toMatch(/historical-international-fixtures/);
  });

  test("does not import attack-defense-profile-builder", () => {
    expect(src).not.toMatch(/attack-defense-profile-builder/);
  });
});

describe("routes.ts does not import historical fixture loader or server-only AD module", () => {
  const src = readSrc("packages/api/src/routes.ts");

  test("no direct historical-international-fixtures import in routes.ts", () => {
    expect(src).not.toMatch(/historical-international-fixtures/);
  });

  test("no attack-defense-runtime-profile-source.server import in routes.ts", () => {
    expect(src).not.toMatch(/attack-defense-runtime-profile-source\.server/);
  });
});

describe("api-client.ts does not import server-only modules", () => {
  const src = readSrc("apps/web/src/lib/api-client.ts");

  test("no .server import in api-client.ts", () => {
    expect(src).not.toMatch(/\.server['"]/);
  });

  test("no attack-defense-server-composition import in api-client.ts", () => {
    expect(src).not.toMatch(/attack-defense-server-composition/);
  });

  test("no historical-international-fixtures import in api-client.ts", () => {
    expect(src).not.toMatch(/historical-international-fixtures/);
  });
});

describe("server-runtime.ts can reach Phase 12.21B production dependencies", () => {
  const src = readSrc("apps/web/src/lib/server-runtime.ts");

  test("imports createAttackDefenseProductionDependencies", () => {
    expect(src).toMatch(/createAttackDefenseProductionDependencies/);
  });

  test("imports from attack-defense-server-composition (server-only path)", () => {
    expect(src).toMatch(/attack-defense-server-composition/);
  });

  test("imports embeddedAttackDefenseSelectedCandidateArtifact", () => {
    expect(src).toMatch(/embeddedAttackDefenseSelectedCandidateArtifact/);
  });

  test("exports diagnostics-only attack/defense dependency factory", () => {
    expect(src).toMatch(/getAttackDefenseProductionDependenciesForDiagnostics/);
  });
});

describe("Next.js build tracing includes immutable Attack/Defense runtime artifact", () => {
  const src = readSrc("apps/web/next.config.ts");

  test("traces attack-defense-runtime-profiles.json", () => {
    expect(src).toMatch(/attack-defense-runtime-profiles\.json/);
  });

  test("does not expose a public Attack/Defense environment variable", () => {
    expect(src).not.toMatch(/NEXT_PUBLIC_.*ATTACK_DEFENSE/);
  });
});

describe("index.ts barrel does not export server-only AD modules", () => {
  const src = readSrc("packages/api/src/index.ts");

  test("does not export attack-defense-runtime-profile-source.server", () => {
    expect(src).not.toMatch(/attack-defense-runtime-profile-source\.server/);
  });

  test("does not export attack-defense-server-composition", () => {
    expect(src).not.toMatch(/attack-defense-server-composition/);
  });

  test("does not export historical-international-fixtures", () => {
    expect(src).not.toMatch(/historical-international-fixtures/);
  });

  test("does not export the runtime eligibility diagnostic script", () => {
    expect(src).not.toMatch(/list-attack-defense-runtime-eligibility/);
  });

  test("does not export raw runtime profile artifact", () => {
    expect(src).not.toMatch(/attack-defense-runtime-profiles/);
  });
});
