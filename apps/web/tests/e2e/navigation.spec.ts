import { expect, test } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

// ---------------------------------------------------------------------------
// Overflow diagnostic helper — returns every visible element whose bounding
// rect extends beyond the current viewport width, starts before x=-1, or has
// a computed min-width larger than the viewport.
// ---------------------------------------------------------------------------
async function getOverflowingElements(page: Parameters<typeof test>[1]["page"], viewportWidth: number) {
  return page.evaluate((vw) => {
    const results: {
      tagName: string;
      id: string;
      className: string;
      left: number;
      right: number;
      width: number;
      computedWidth: string;
      computedMinWidth: string;
      computedPosition: string;
    }[] = [];

    const all = document.querySelectorAll("*");
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const pos = style.position;

      // Skip fixed elements — they are viewport-relative and don't contribute
      // to scrollWidth (unless broken). Skip hidden elements.
      if (pos === "fixed" || style.display === "none" || style.visibility === "hidden") {
        continue;
      }

      // An element overflows if its right edge is past the viewport + 1px
      // or its left edge is before -1px.
      if (rect.right > vw + 1 || rect.left < -1) {
        results.push({
          tagName: el.tagName,
          id: el.id ?? "",
          className: typeof el.className === "string" ? el.className.slice(0, 120) : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          computedWidth: style.width,
          computedMinWidth: style.minWidth,
          computedPosition: pos,
        });
      }
    }
    return results;
  }, viewportWidth);
}

// ---------------------------------------------------------------------------
// Desktop navigation
// ---------------------------------------------------------------------------
test.describe("Application shell — desktop navigation", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test("primary navigation renders on desktop", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(nav).toBeVisible();
  });

  test("all primary nav links are visible on desktop", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    for (const label of ["Home", "Matches", "Groups", "Predictions", "Tournament", "Model"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("Home link is active on the home route (aria-current=page)", async ({ page }) => {
    await page.goto("/");
    const homeLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Home" });
    await expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  test("navigating to /matches activates Matches nav item", async ({ page }) => {
    await page.goto("/matches");
    const matchesLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Matches" });
    await expect(matchesLink).toHaveAttribute("aria-current", "page");
  });

  test("navigating to /groups activates Groups nav item", async ({ page }) => {
    await page.goto("/groups");
    const groupsLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Groups" });
    await expect(groupsLink).toHaveAttribute("aria-current", "page");
  });

  test("navigating to /groups/A keeps Groups nav item active (nested route)", async ({ page }) => {
    await page.goto("/groups/A");
    const groupsLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Groups" });
    await expect(groupsLink).toHaveAttribute("aria-current", "page");
  });

  test("navigating to /prediction-history does not activate Predictions nav item", async ({ page }) => {
    await page.goto("/prediction-history");
    const predictionsLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Predictions" });
    await expect(predictionsLink).not.toHaveAttribute("aria-current", "page");
  });

  test("History secondary link is visible on desktop", async ({ page }) => {
    await page.goto("/");
    const historyLink = page.getByRole("link", { name: "History", exact: true });
    await expect(historyLink).toBeVisible();
  });

  test("clicking Matches navigates to /matches and page renders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Matches" }).click();
    await expect(page).toHaveURL("/matches");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("clicking Groups navigates to /groups and page renders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Groups" }).click();
    await expect(page).toHaveURL("/groups");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("page has exactly one main landmark", async ({ page }) => {
    await page.goto("/");
    const mains = page.getByRole("main");
    await expect(mains).toHaveCount(1);
  });

  test("skip link exists and targets #main-content", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test("page does not have horizontal overflow on desktop", async ({ page }) => {
    await page.goto("/");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

// ---------------------------------------------------------------------------
// Mobile navigation — complete viewport coverage
// ---------------------------------------------------------------------------
test.describe("Application shell — mobile navigation", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("mobile bottom navigation renders on mobile", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(nav).toBeVisible();
  });

  test("primary desktop navigation is hidden on mobile", async ({ page }) => {
    await page.goto("/");
    const desktopNav = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(desktopNav).toBeHidden();
  });

  test("Home mobile nav item is active on /", async ({ page }) => {
    await page.goto("/");
    const homeLink = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Home" });
    await expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  test("More button is visible in mobile nav", async ({ page }) => {
    await page.goto("/");
    const moreButton = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "More" });
    await expect(moreButton).toBeVisible();
  });

  test("More menu opens when More button is clicked", async ({ page }) => {
    await page.goto("/");
    const moreButton = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "More" });
    await moreButton.click();
    const moreMenu = page.getByRole("menu", { name: "More destinations" });
    await expect(moreMenu).toBeVisible();
  });

  test("More menu closes when Escape is pressed", async ({ page }) => {
    await page.goto("/");
    const moreButton = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "More" });
    await moreButton.click();
    await page.keyboard.press("Escape");
    const moreMenu = page.getByRole("menu", { name: "More destinations" });
    await expect(moreMenu).toBeHidden();
  });

  test("mobile content is not hidden behind fixed bottom nav", async ({ page }) => {
    await page.goto("/");
    const main = page.getByRole("main");
    await expect(main).toBeVisible();
    const navBox = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    if (navBox) {
      expect(navBox.y + navBox.height).toBeLessThanOrEqual(bodyHeight + 1);
    }
  });

  test("navigating to /groups via mobile nav renders the groups page", async ({ page }) => {
    await page.goto("/");
    const groupsLink = page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Groups" });
    await groupsLink.click();
    await expect(page).toHaveURL("/groups");
    await expect(page.getByRole("main")).toBeVisible();
  });

  // ----- strengthened overflow + nav layout tests -----

  test("document scrollWidth does not exceed viewport width (390px)", async ({ page }) => {
    await page.goto("/");

    const { scrollWidth, clientWidth, overflowing } = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const cw = document.documentElement.clientWidth;

      const results: { tag: string; id: string; cls: string; left: number; right: number }[] = [];
      if (sw > cw) {
        for (const el of document.querySelectorAll("*")) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (style.position === "fixed" || style.display === "none") continue;
          if (rect.right > cw + 1 || rect.left < -1) {
            results.push({
              tag: el.tagName,
              id: el.id ?? "",
              cls: typeof el.className === "string" ? el.className.slice(0, 100) : "",
              left: Math.round(rect.left),
              right: Math.round(rect.right),
            });
          }
        }
      }
      return { scrollWidth: sw, clientWidth: cw, overflowing: results };
    });

    if (overflowing.length > 0) {
      const report = overflowing
        .slice(0, 10)
        .map((e) => `  ${e.tag}#${e.id || "(no id)"} [${e.left}..${e.right}px] cls="${e.cls}"`)
        .join("\n");
      console.error(`\nOverflowing elements (first ${Math.min(10, overflowing.length)}):\n${report}`);
    }

    expect(
      scrollWidth,
      `scrollWidth (${scrollWidth}px) exceeds clientWidth (${clientWidth}px). First overflowing elements:\n${
        overflowing.slice(0, 5).map((e) => `${e.tag}#${e.id} left=${e.left} right=${e.right}`).join("\n")
      }`
    ).toBeLessThanOrEqual(clientWidth);
  });

  test("mobile bottom nav bounding box is fully inside the viewport", async ({ page }) => {
    await page.goto("/");
    const viewportWidth = MOBILE_VIEWPORT.width;
    const viewportHeight = MOBILE_VIEWPORT.height;

    const navBox = await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .boundingBox();

    expect(navBox).not.toBeNull();
    if (!navBox) return;

    expect(navBox.x, "nav left edge must be >= 0").toBeGreaterThanOrEqual(0);
    expect(navBox.x + navBox.width, "nav right edge must be <= viewport width").toBeLessThanOrEqual(viewportWidth + 1);
    expect(navBox.y + navBox.height, "nav bottom edge must be <= viewport height").toBeLessThanOrEqual(viewportHeight + 1);
  });

  test("all five mobile nav destinations are inside the nav bounding box", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Mobile navigation" });
    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    if (!navBox) return;

    const labels = ["Home", "Matches", "Predict", "Groups", "More"];
    for (const label of labels) {
      // links or buttons
      const item = nav.locator(`a, button`).filter({ hasText: label }).first();
      const itemBox = await item.boundingBox();
      expect(itemBox, `"${label}" item bounding box must exist`).not.toBeNull();
      if (!itemBox) continue;

      expect(
        itemBox.x,
        `"${label}" left edge (${itemBox.x}) must be inside nav (${navBox.x})`
      ).toBeGreaterThanOrEqual(navBox.x - 1);

      expect(
        itemBox.x + itemBox.width,
        `"${label}" right edge (${itemBox.x + itemBox.width}) must be inside nav right (${navBox.x + navBox.width})`
      ).toBeLessThanOrEqual(navBox.x + navBox.width + 1);
    }
  });

  test("none of the five mobile nav labels is clipped horizontally", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Mobile navigation" });
    const viewportWidth = MOBILE_VIEWPORT.width;

    const labels = ["Home", "Matches", "Predict", "Groups"];
    for (const label of labels) {
      const link = nav.getByRole("link", { name: label });
      const box = await link.boundingBox();
      expect(box, `"${label}" link must be visible`).not.toBeNull();
      if (!box) continue;
      // The link's right edge must be within the viewport
      expect(
        box.x + box.width,
        `"${label}" link right edge exceeds viewport`
      ).toBeLessThanOrEqual(viewportWidth + 1);
      // The link must have positive width (not zero-sized)
      expect(box.width, `"${label}" link has zero or negative width`).toBeGreaterThan(0);
    }

    // More button
    const moreButton = nav.getByRole("button", { name: "More" });
    const moreBox = await moreButton.boundingBox();
    expect(moreBox, "More button must be visible").not.toBeNull();
    if (moreBox) {
      expect(moreBox.x + moreBox.width, "More button right edge exceeds viewport").toBeLessThanOrEqual(viewportWidth + 1);
      expect(moreBox.width, "More button has zero or negative width").toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-viewport overflow check — 320, 375, 390, 430
// ---------------------------------------------------------------------------
const EXTRA_MOBILE_VIEWPORTS = [
  { width: 320, height: 568, label: "320×568" },
  { width: 375, height: 667, label: "375×667" },
  { width: 430, height: 932, label: "430×932" },
];

for (const vp of EXTRA_MOBILE_VIEWPORTS) {
  test.describe(`Overflow — ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`document scrollWidth does not exceed viewport width at ${vp.label}`, async ({ page }) => {
      await page.goto("/");
      const { scrollWidth, clientWidth, overflowing } = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const cw = document.documentElement.clientWidth;
        const results: { tag: string; id: string; cls: string; left: number; right: number }[] = [];
        if (sw > cw) {
          for (const el of document.querySelectorAll("*")) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (style.position === "fixed" || style.display === "none") continue;
            if (rect.right > cw + 1 || rect.left < -1) {
              results.push({
                tag: el.tagName,
                id: el.id ?? "",
                cls: typeof el.className === "string" ? el.className.slice(0, 100) : "",
                left: Math.round(rect.left),
                right: Math.round(rect.right),
              });
            }
          }
        }
        return { scrollWidth: sw, clientWidth: cw, overflowing: results };
      });

      if (overflowing.length > 0) {
        const report = overflowing
          .slice(0, 10)
          .map((e) => `  ${e.tag}#${e.id || "(no id)"} [${e.left}..${e.right}px] cls="${e.cls}"`)
          .join("\n");
        console.error(`\n[${vp.label}] Overflowing elements (first ${Math.min(10, overflowing.length)}):\n${report}`);
      }

      expect(
        scrollWidth,
        `[${vp.label}] scrollWidth (${scrollWidth}px) exceeds clientWidth (${clientWidth}px). Overflowing:\n${
          overflowing.slice(0, 5).map((e) => `${e.tag}#${e.id} left=${e.left} right=${e.right}`).join("\n")
        }`
      ).toBeLessThanOrEqual(clientWidth);
    });

    test(`mobile nav contains all five destinations at ${vp.label}`, async ({ page }) => {
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: "Mobile navigation" });
      await expect(nav).toBeVisible();
      const navBox = await nav.boundingBox();
      expect(navBox).not.toBeNull();
      if (!navBox) return;

      for (const label of ["Home", "Matches", "Predict", "Groups"]) {
        const link = nav.getByRole("link", { name: label });
        const box = await link.boundingBox();
        expect(box, `[${vp.label}] "${label}" must be visible`).not.toBeNull();
        if (!box) continue;
        expect(box.width, `[${vp.label}] "${label}" must have positive width`).toBeGreaterThan(0);
        expect(box.x + box.width, `[${vp.label}] "${label}" right edge must be within viewport`).toBeLessThanOrEqual(vp.width + 1);
      }
      const moreButton = nav.getByRole("button", { name: "More" });
      await expect(moreButton).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// Overflow diagnostic — standalone diagnostic test for debugging
// ---------------------------------------------------------------------------
test.describe("Overflow diagnostic", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("identify all overflowing elements at 390px (diagnostic — always logs)", async ({ page }) => {
    await page.goto("/");
    const elements = await getOverflowingElements(page, MOBILE_VIEWPORT.width);

    if (elements.length > 0) {
      console.log(`\nFound ${elements.length} overflowing element(s) at 390px viewport:`);
      for (const el of elements.slice(0, 20)) {
        console.log(
          `  tag=${el.tagName} id=${el.id || "(none)"} left=${el.left} right=${el.right} ` +
          `width=${el.width} minWidth=${el.computedMinWidth} pos=${el.computedPosition}\n` +
          `    class="${el.className}"`
        );
      }
    } else {
      console.log("No overflowing elements found at 390px viewport.");
    }

    // This diagnostic test always passes — it only logs. The real assertion is in the other tests.
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Existing pages continue to render (no double headers)
// ---------------------------------------------------------------------------
test.describe("Existing pages continue to render (no double headers)", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test("home page loads and has exactly one header", async ({ page }) => {
    await page.goto("/");
    const headers = page.getByRole("banner");
    await expect(headers).toHaveCount(1);
  });

  test("groups/A detail page loads and has exactly one header", async ({ page }) => {
    await page.goto("/groups/A");
    const headers = page.getByRole("banner");
    await expect(headers).toHaveCount(1);
  });

  test("prediction-history page loads and has exactly one header", async ({ page }) => {
    await page.goto("/prediction-history");
    const headers = page.getByRole("banner");
    await expect(headers).toHaveCount(1);
  });

  test("/matches page loads and renders heading", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Matches", exact: true })).toBeVisible();
  });

  test("/groups page loads and renders heading", async ({ page }) => {
    await page.goto("/groups");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Groups", exact: true })).toBeVisible();
  });

  test("/predictions page loads and renders heading", async ({ page }) => {
    await page.goto("/predictions");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Predictions", exact: true })).toBeVisible();
  });

  test("/tournament page loads and renders heading", async ({ page }) => {
    await page.goto("/tournament");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tournament", exact: true })).toBeVisible();
  });

  test("/model page loads and renders heading", async ({ page }) => {
    await page.goto("/model");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Model", exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Accessibility — skip link
// ---------------------------------------------------------------------------
test.describe("Accessibility — skip link", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test("skip link is keyboard-focusable and moves focus to main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focusedHref = await page.evaluate(() => {
      const el = document.activeElement as HTMLAnchorElement | null;
      return el?.getAttribute("href");
    });
    expect(focusedHref).toBe("#main-content");
  });
});
