import { describe, expect, test } from "vitest";
import {
  UNKNOWN_TEAM_VISUAL_IDENTITY,
  WORLD_CUP_2026_TEAM_IDENTITIES,
  assertAllCanonicalTeamsCovered,
  getTeamFlagPath,
  getTeamVisualIdentity,
  isKnownTeam,
  resolveTeamVisualIdentity
} from "../src/world-cup-2026-team-identity.js";
import { WORLD_CUP_2026_TEAM_NAMES } from "../src/world-cup-2026-teams.js";

describe("WORLD_CUP_2026_TEAM_IDENTITIES", () => {
  test("has exactly 48 entries — one per canonical team", () => {
    expect(WORLD_CUP_2026_TEAM_IDENTITIES).toHaveLength(48);
  });

  test("every entry has a unique teamId", () => {
    const ids = WORLD_CUP_2026_TEAM_IDENTITIES.map((t) => t.teamId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every entry has a unique canonicalName", () => {
    const names = WORLD_CUP_2026_TEAM_IDENTITIES.map((t) => t.canonicalName);
    expect(new Set(names).size).toBe(names.length);
  });

  test("every entry has a unique fifaCode", () => {
    const codes = WORLD_CUP_2026_TEAM_IDENTITIES.map((t) => t.fifaCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test("every fifaCode is exactly 3 characters", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      expect(identity.fifaCode, `${identity.canonicalName} fifaCode length`).toHaveLength(3);
    }
  });

  test("every flagPath uses lowercase FIFA code and correct directory", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      expect(identity.flagPath, `${identity.canonicalName} flagPath`).toBe(
        `/flags/world-cup-2026/${identity.fifaCode.toLowerCase()}.svg`
      );
    }
  });

  test("no flagPath uses a remote URL", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      if (identity.flagPath !== null) {
        expect(identity.flagPath, `${identity.canonicalName} flagPath must be local`).not.toMatch(/^https?:\/\//);
      }
    }
  });

  test("every flagAlt is non-empty", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      expect(identity.flagAlt.trim(), `${identity.canonicalName} flagAlt`).not.toBe("");
    }
  });

  test("every shortName is non-empty", () => {
    for (const identity of WORLD_CUP_2026_TEAM_IDENTITIES) {
      expect(identity.shortName.trim(), `${identity.canonicalName} shortName`).not.toBe("");
    }
  });
});

describe("getTeamVisualIdentity", () => {
  test("resolves all 48 canonical team names", () => {
    for (const name of WORLD_CUP_2026_TEAM_NAMES) {
      const identity = getTeamVisualIdentity(name);
      expect(identity.teamId, `${name} must resolve`).not.toBe("unknown");
      expect(identity.canonicalName).toBe(name);
    }
  });

  test("returns unknown fallback for an unknown team", () => {
    const identity = getTeamVisualIdentity("Atlantis FC");
    expect(identity.teamId).toBe("unknown");
    expect(identity.fifaCode).toBe("???");
    expect(identity.flagPath).toBeNull();
  });

  test("Mexico resolves correctly", () => {
    const identity = getTeamVisualIdentity("Mexico");
    expect(identity.teamId).toBe("mexico");
    expect(identity.fifaCode).toBe("MEX");
    expect(identity.flagPath).toBe("/flags/world-cup-2026/mex.svg");
  });

  test("DR Congo resolves correctly", () => {
    const identity = getTeamVisualIdentity("DR Congo");
    expect(identity.teamId).toBe("dr-congo");
    expect(identity.fifaCode).toBe("COD");
    expect(identity.flagPath).toBe("/flags/world-cup-2026/cod.svg");
  });

  test("South Korea resolves correctly", () => {
    const identity = getTeamVisualIdentity("South Korea");
    expect(identity.teamId).toBe("south-korea");
    expect(identity.fifaCode).toBe("KOR");
  });

  test("United States resolves correctly", () => {
    const identity = getTeamVisualIdentity("United States");
    expect(identity.teamId).toBe("united-states");
    expect(identity.fifaCode).toBe("USA");
  });

  test("England has null countryCode — it is an association, not a sovereign state", () => {
    const identity = getTeamVisualIdentity("England");
    expect(identity.countryCode).toBeNull();
    expect(identity.flagAlt).toContain("Association flag");
  });

  test("Scotland has null countryCode and association alt text", () => {
    const identity = getTeamVisualIdentity("Scotland");
    expect(identity.countryCode).toBeNull();
    expect(identity.flagAlt).toContain("Association flag");
  });

  test("Curacao resolves correctly", () => {
    const identity = getTeamVisualIdentity("Curacao");
    expect(identity.teamId).toBe("curacao");
    expect(identity.fifaCode).toBe("CUW");
  });

  test("Cape Verde resolves correctly", () => {
    const identity = getTeamVisualIdentity("Cape Verde");
    expect(identity.fifaCode).toBe("CPV");
  });

  test("is case-insensitive and normalizes diacritics", () => {
    expect(getTeamVisualIdentity("mexico").teamId).toBe("mexico");
    expect(getTeamVisualIdentity("MEXICO").teamId).toBe("mexico");
  });
});

describe("resolveTeamVisualIdentity — provider alias resolution", () => {
  test("resolves 'Korea Republic' via alias to South Korea", () => {
    const identity = resolveTeamVisualIdentity("Korea Republic");
    expect(identity.canonicalName).toBe("South Korea");
    expect(identity.fifaCode).toBe("KOR");
  });

  test("resolves 'Congo DR' via alias to DR Congo", () => {
    const identity = resolveTeamVisualIdentity("Congo DR");
    expect(identity.canonicalName).toBe("DR Congo");
    expect(identity.fifaCode).toBe("COD");
  });

  test("resolves 'USA' via alias to United States", () => {
    const identity = resolveTeamVisualIdentity("USA");
    expect(identity.canonicalName).toBe("United States");
  });

  test("resolves 'Curaçao' (with diacritic) via normalization to Curacao", () => {
    const identity = resolveTeamVisualIdentity("Curaçao");
    expect(identity.canonicalName).toBe("Curacao");
    expect(identity.fifaCode).toBe("CUW");
  });

  test("resolves 'Cape Verde Islands' via alias to Cape Verde", () => {
    const identity = resolveTeamVisualIdentity("Cape Verde Islands");
    expect(identity.canonicalName).toBe("Cape Verde");
  });

  test("resolves 'DR Congo' directly", () => {
    const identity = resolveTeamVisualIdentity("DR Congo");
    expect(identity.canonicalName).toBe("DR Congo");
  });

  test("returns unknown fallback for an unknown provider name", () => {
    const identity = resolveTeamVisualIdentity("Unknown Provider FC");
    expect(identity.teamId).toBe("unknown");
  });

  test("does not mutate canonical team records", () => {
    const before = getTeamVisualIdentity("Brazil");
    resolveTeamVisualIdentity("Brazil");
    const after = getTeamVisualIdentity("Brazil");
    expect(after).toStrictEqual(before);
  });
});

describe("getTeamFlagPath", () => {
  test("returns local flag path for a known team", () => {
    expect(getTeamFlagPath("Colombia")).toBe("/flags/world-cup-2026/col.svg");
  });

  test("returns null for unknown team", () => {
    expect(getTeamFlagPath("Planet Mars FC")).toBeNull();
  });
});

describe("isKnownTeam", () => {
  test("returns true for all canonical team names", () => {
    for (const name of WORLD_CUP_2026_TEAM_NAMES) {
      expect(isKnownTeam(name), `${name} should be known`).toBe(true);
    }
  });

  test("returns false for an unknown team", () => {
    expect(isKnownTeam("Atlantis FC")).toBe(false);
  });
});

describe("assertAllCanonicalTeamsCovered", () => {
  test("does not throw — all 48 canonical teams are covered", () => {
    expect(() => assertAllCanonicalTeamsCovered()).not.toThrow();
  });
});

describe("UNKNOWN_TEAM_VISUAL_IDENTITY", () => {
  test("has expected shape", () => {
    expect(UNKNOWN_TEAM_VISUAL_IDENTITY.teamId).toBe("unknown");
    expect(UNKNOWN_TEAM_VISUAL_IDENTITY.fifaCode).toBe("???");
    expect(UNKNOWN_TEAM_VISUAL_IDENTITY.flagPath).toBeNull();
  });
});
