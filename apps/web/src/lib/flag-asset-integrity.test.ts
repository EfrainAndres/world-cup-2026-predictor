import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { WORLD_CUP_2026_TEAM_IDENTITIES } from "@world-cup-2026-predictor/api";

const WEB_PUBLIC_DIR = join(import.meta.dirname, "..", "..", "public");
const FLAGS_DIR = join(WEB_PUBLIC_DIR, "flags", "world-cup-2026");

describe("Flag asset integrity", () => {
  test("every non-null flagPath points to an existing local file", () => {
    const missing: string[] = [];

    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      if (identity.flagPath === null) {
        continue;
      }

      const relativePath = identity.flagPath.replace(/^\//, "");
      const absolutePath = join(WEB_PUBLIC_DIR, relativePath);

      if (!existsSync(absolutePath)) {
        missing.push(`${identity.canonicalName}: ${absolutePath}`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing flag assets:\n${missing.join("\n")}`);
    }
  });

  test("every flagPath follows the naming convention: /flags/world-cup-2026/{fifaCode.toLowerCase()}.svg", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      const expected = `/flags/world-cup-2026/${identity.fifaCode.toLowerCase()}.svg`;
      expect(identity.flagPath, `${identity.canonicalName}`).toBe(expected);
    }
  });

  test("no flagPath uses a remote URL", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      if (identity.flagPath !== null) {
        expect(identity.flagPath, `${identity.canonicalName}`).not.toMatch(/^https?:\/\//);
      }
    }
  });

  test("all 48 teams have a non-null flagPath", () => {
    const withoutFlag = WORLD_CUP_2026_TEAM_IDENTITIES.filter((t) => t.flagPath === null);
    expect(withoutFlag).toHaveLength(0);
  });

  test("files in flags directory are SVGs by extension", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      if (identity.flagPath !== null) {
        expect(identity.flagPath).toMatch(/\.svg$/);
      }
    }
  });

  test("flags directory exists", () => {
    expect(existsSync(FLAGS_DIR)).toBe(true);
  });
});
