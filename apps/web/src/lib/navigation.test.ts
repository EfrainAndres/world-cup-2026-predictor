import { describe, expect, test } from "vitest";
import {
  isRouteActive,
  MOBILE_BOTTOM_ITEMS,
  MOBILE_MORE_ITEMS,
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
} from "./navigation";

describe("isRouteActive", () => {
  test("home route requires exact match — returns true for /", () => {
    expect(isRouteActive("/", "/")).toBe(true);
  });

  test("home route does not activate for nested paths", () => {
    expect(isRouteActive("/matches", "/")).toBe(false);
    expect(isRouteActive("/groups/A", "/")).toBe(false);
    expect(isRouteActive("/prediction-history", "/")).toBe(false);
  });

  test("non-root href matches its exact path", () => {
    expect(isRouteActive("/matches", "/matches")).toBe(true);
    expect(isRouteActive("/groups", "/groups")).toBe(true);
    expect(isRouteActive("/predictions", "/predictions")).toBe(true);
    expect(isRouteActive("/tournament", "/tournament")).toBe(true);
    expect(isRouteActive("/model", "/model")).toBe(true);
    expect(isRouteActive("/prediction-history", "/prediction-history")).toBe(true);
  });

  test("non-root href activates for nested routes", () => {
    expect(isRouteActive("/groups/A", "/groups")).toBe(true);
    expect(isRouteActive("/groups/L", "/groups")).toBe(true);
    expect(isRouteActive("/matches/123", "/matches")).toBe(true);
    expect(isRouteActive("/model/evidence", "/model")).toBe(true);
  });

  test("prefix match requires a path separator — not a partial string", () => {
    // /prediction-history must NOT activate /predictions
    expect(isRouteActive("/prediction-history", "/predictions")).toBe(false);
    // /models must NOT activate /model
    expect(isRouteActive("/models", "/model")).toBe(false);
    // /groups-extra must NOT activate /groups
    expect(isRouteActive("/groups-extra", "/groups")).toBe(false);
  });

  test("unrelated paths return false", () => {
    expect(isRouteActive("/tournament", "/model")).toBe(false);
    expect(isRouteActive("/groups", "/predictions")).toBe(false);
    expect(isRouteActive("/", "/matches")).toBe(false);
  });
});

describe("PRIMARY_NAV_ITEMS", () => {
  test("has no duplicate hrefs", () => {
    const hrefs = PRIMARY_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("has no duplicate labels", () => {
    const labels = PRIMARY_NAV_ITEMS.map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("Home is the first item with href /", () => {
    expect(PRIMARY_NAV_ITEMS[0]).toEqual({ label: "Home", href: "/" });
  });

  test("includes all required route destinations", () => {
    const hrefs = PRIMARY_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/matches");
    expect(hrefs).toContain("/groups");
    expect(hrefs).toContain("/predictions");
    expect(hrefs).toContain("/tournament");
    expect(hrefs).toContain("/model");
  });
});

describe("SECONDARY_NAV_ITEMS", () => {
  test("has no duplicate hrefs", () => {
    const hrefs = SECONDARY_NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("includes Prediction History", () => {
    const hrefs = SECONDARY_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain("/prediction-history");
  });
});

describe("MOBILE_BOTTOM_ITEMS", () => {
  test("has at most 4 direct items — the 5th slot is the synthetic More button", () => {
    expect(MOBILE_BOTTOM_ITEMS.length).toBeLessThanOrEqual(4);
  });

  test("has no duplicate hrefs", () => {
    const hrefs = MOBILE_BOTTOM_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("MOBILE_MORE_ITEMS", () => {
  test("has no duplicate hrefs", () => {
    const hrefs = MOBILE_MORE_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("all items appear in PRIMARY_NAV_ITEMS or SECONDARY_NAV_ITEMS", () => {
    const allNavHrefs = new Set([
      ...PRIMARY_NAV_ITEMS.map((i) => i.href),
      ...SECONDARY_NAV_ITEMS.map((i) => i.href),
    ]);
    for (const item of MOBILE_MORE_ITEMS) {
      expect(allNavHrefs.has(item.href), `${item.href} missing from primary/secondary nav`).toBe(true);
    }
  });
});

describe("navigation source uniqueness", () => {
  test("MOBILE_BOTTOM_ITEMS and MOBILE_MORE_ITEMS have no overlapping hrefs", () => {
    const bottomHrefs = new Set(MOBILE_BOTTOM_ITEMS.map((i) => i.href));
    for (const item of MOBILE_MORE_ITEMS) {
      expect(bottomHrefs.has(item.href), `${item.href} appears in both bottom and more nav`).toBe(false);
    }
  });

  test("combined mobile items cover all primary nav destinations", () => {
    const allMobileHrefs = new Set([
      ...MOBILE_BOTTOM_ITEMS.map((i) => i.href),
      ...MOBILE_MORE_ITEMS.map((i) => i.href),
    ]);
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(allMobileHrefs.has(item.href), `${item.href} not reachable from mobile nav`).toBe(true);
    }
  });
});
