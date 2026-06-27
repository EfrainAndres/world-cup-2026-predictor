import {
  WORLD_CUP_2026_GROUP_STANDINGS,
  buildWorldCup2026BestThirdPlaceRanking
} from "@world-cup-2026-predictor/api";
import { describe, expect, it } from "vitest";
import {
  formatGD,
  formatGroupProgress,
  getProjectionSourcePresentation,
  getSourcePresentation,
  groupIsComplete,
  isValidGroup,
  projectionSourceToVariant,
  toBestThirdPlaceRankingInput,
  VALID_GROUPS
} from "./groups-tournament-ui";

describe("formatGD", () => {
  it("returns +N for positive values", () => {
    expect(formatGD(3)).toBe("+3");
    expect(formatGD(1)).toBe("+1");
  });

  it("returns 0 for zero", () => {
    expect(formatGD(0)).toBe("0");
  });

  it("returns -N for negative values", () => {
    expect(formatGD(-2)).toBe("-2");
    expect(formatGD(-10)).toBe("-10");
  });
});

describe("groupIsComplete", () => {
  it("returns true when pending is 0 and completed > 0", () => {
    expect(groupIsComplete(6, 0)).toBe(true);
    expect(groupIsComplete(1, 0)).toBe(true);
  });

  it("returns false when pending > 0", () => {
    expect(groupIsComplete(3, 3)).toBe(false);
    expect(groupIsComplete(0, 6)).toBe(false);
  });

  it("returns false when completed is 0 and pending is 0 (not yet started)", () => {
    expect(groupIsComplete(0, 0)).toBe(false);
  });
});

describe("formatGroupProgress", () => {
  it("returns 'Complete' when all matches played", () => {
    expect(formatGroupProgress(6, 0)).toBe("Complete");
  });

  it("returns '0 / N played' before any matches", () => {
    expect(formatGroupProgress(0, 6)).toBe("0 / 6 played");
  });

  it("returns 'X / N played' for partial progress", () => {
    expect(formatGroupProgress(2, 4)).toBe("2 / 6 played");
    expect(formatGroupProgress(5, 1)).toBe("5 / 6 played");
  });

  it("handles different totals", () => {
    expect(formatGroupProgress(1, 2)).toBe("1 / 3 played");
  });
});

describe("isValidGroup", () => {
  it("accepts all 12 valid groups (uppercase)", () => {
    for (const g of VALID_GROUPS) {
      expect(isValidGroup(g)).toBe(true);
    }
  });

  it("accepts lowercase inputs via toUpperCase", () => {
    expect(isValidGroup("a")).toBe(true);
    expect(isValidGroup("l")).toBe(true);
  });

  it("rejects invalid group letters", () => {
    expect(isValidGroup("M")).toBe(false);
    expect(isValidGroup("Z")).toBe(false);
    expect(isValidGroup("")).toBe(false);
    expect(isValidGroup("1")).toBe(false);
  });
});

describe("toBestThirdPlaceRankingInput", () => {
  it("preserves all 12 groups in A-L order for best-third-place ranking", () => {
    const input = toBestThirdPlaceRankingInput(WORLD_CUP_2026_GROUP_STANDINGS);

    expect(input).toHaveLength(12);
    expect(input.map((group) => group.group)).toEqual([...VALID_GROUPS]);
    expect(buildWorldCup2026BestThirdPlaceRanking(input)).toHaveLength(12);
  });
});

describe("getSourcePresentation", () => {
  it("returns official presentation for 'official'", () => {
    const p = getSourcePresentation("official");
    expect(p.label).toBe("Official");
    expect(p.variant).toBe("official");
    expect(p.badgeClasses).toContain("teal");
  });

  it("returns projected presentation for 'projected'", () => {
    const p = getSourcePresentation("projected");
    expect(p.label).toBe("Projected");
    expect(p.variant).toBe("projected");
    expect(p.badgeClasses).toContain("blue");
  });

  it("returns provisional presentation for 'provisional'", () => {
    const p = getSourcePresentation("provisional");
    expect(p.label).toBe("Live provisional");
    expect(p.variant).toBe("provisional");
    expect(p.badgeClasses).toContain("amber");
  });

  it("returns unavailable presentation for 'unavailable'", () => {
    const p = getSourcePresentation("unavailable");
    expect(p.label).toBe("Unavailable");
    expect(p.variant).toBe("unavailable");
    expect(p.badgeClasses).toContain("slate");
  });

  it("returns stored presentation for 'stored'", () => {
    const p = getSourcePresentation("stored");
    expect(p.label).toBe("Stored prediction");
    expect(p.variant).toBe("stored");
  });

  it("returns auto presentation for 'auto'", () => {
    const p = getSourcePresentation("auto");
    expect(p.label).toBe("Auto Predict");
    expect(p.variant).toBe("auto");
  });
});

describe("projectionSourceToVariant", () => {
  it("maps stored_snapshot to stored", () => {
    expect(projectionSourceToVariant("stored_snapshot")).toBe("stored");
  });

  it("maps auto_predict to auto", () => {
    expect(projectionSourceToVariant("auto_predict")).toBe("auto");
  });

  it("maps unavailable to unavailable", () => {
    expect(projectionSourceToVariant("unavailable")).toBe("unavailable");
  });
});

describe("getProjectionSourcePresentation", () => {
  it("returns stored presentation for stored_snapshot", () => {
    const p = getProjectionSourcePresentation("stored_snapshot");
    expect(p.label).toBe("Stored prediction");
  });

  it("returns auto presentation for auto_predict", () => {
    const p = getProjectionSourcePresentation("auto_predict");
    expect(p.label).toBe("Auto Predict");
  });

  it("returns unavailable presentation for unavailable", () => {
    const p = getProjectionSourcePresentation("unavailable");
    expect(p.label).toBe("Unavailable");
  });
});
