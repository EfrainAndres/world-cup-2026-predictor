import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/matches", label: "Matches" },
  { path: "/matches/wc2026-group-a-md1-01-mexico-vs-south-africa", label: "Match detail" },
  { path: "/groups", label: "Groups" },
  { path: "/groups/A", label: "Group detail" },
  { path: "/predictions", label: "Predictions" },
  { path: "/prediction-history", label: "Prediction History" },
  { path: "/tournament", label: "Tournament" },
  { path: "/model", label: "Model and Evidence Center" }
] as const;

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
] as const;

const MOBILE_WIDTHS = new Set([320, 360, 375, 390, 430, 768, 820]);

async function expectNoDocumentOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth
  }));

  expect(result.documentScrollWidth).toBeLessThanOrEqual(result.documentClientWidth + 1);
  expect(result.bodyScrollWidth).toBeLessThanOrEqual(result.bodyClientWidth + 1);
}

async function expectNoDuplicateIds(page: Page) {
  const duplicates = await page.evaluate(() => {
    const counts = new Map<string, number>();
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("[id]"))) {
      counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    }
    return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([id]) => id);
  });

  expect(duplicates).toEqual([]);
}

async function expectAriaLabelledByTargets(page: Page) {
  const broken = await page.evaluate(() => {
    const failures: string[] = [];
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("[aria-labelledby]"))) {
      const ids = (element.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
      for (const id of ids) {
        if (document.querySelectorAll(`#${CSS.escape(id)}`).length !== 1) {
          failures.push(`${element.tagName.toLowerCase()} -> ${id}`);
        }
      }
    }
    return failures;
  });

  expect(broken).toEqual([]);
}

async function expectNamedInteractiveControls(page: Page) {
  const unnamed = await page.evaluate(() => {
    const selector = "a, button, [role='button'], [role='link'], [role='menuitem']";
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const ariaHidden = element.getAttribute("aria-hidden") === "true";
        if (ariaHidden) return false;
        const text = element.textContent?.trim() ?? "";
        const aria = element.getAttribute("aria-label")?.trim() ?? "";
        const labelledBy = element.getAttribute("aria-labelledby")?.trim() ?? "";
        const title = element.getAttribute("title")?.trim() ?? "";
        const id = element.getAttribute("id");
        const hasLabel = id !== null && document.querySelector(`label[for="${CSS.escape(id)}"]`) !== null;
        return text.length === 0 && aria.length === 0 && labelledBy.length === 0 && title.length === 0 && !hasLabel;
      })
      .map((element) => element.outerHTML.slice(0, 160));
  });

  expect(unnamed).toEqual([]);
}

async function expectFormControlsHaveLabels(page: Page) {
  const unlabeled = await page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:not([type='hidden']), select, textarea"))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const id = element.getAttribute("id");
        return !(
          element.getAttribute("aria-label") ||
          element.getAttribute("aria-labelledby") ||
          element.closest("label") ||
          (id !== null && document.querySelector(`label[for="${CSS.escape(id)}"]`))
        );
      })
      .map((element) => element.outerHTML.slice(0, 160));
  });

  expect(unlabeled).toEqual([]);
}

async function expectImagesHaveAlt(page: Page) {
  const missingAlt = await page.evaluate(() => {
    return Array.from(document.images)
      .filter((image) => !image.hasAttribute("alt"))
      .map((image) => image.outerHTML.slice(0, 160));
  });

  expect(missingAlt).toEqual([]);
}

async function expectNoNestedInteractive(page: Page) {
  const nested = await page.evaluate(() => {
    const interactive = "a, button, [role='button'], [role='link'], [role='menuitem']";
    return Array.from(document.querySelectorAll<HTMLElement>(interactive))
      .filter((element) => element.querySelector(interactive) !== null)
      .map((element) => element.outerHTML.slice(0, 160));
  });

  expect(nested).toEqual([]);
}

async function expectMobileNavClearance(page: Page) {
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
  const navBox = await nav.boundingBox();
  expect(navBox).not.toBeNull();
  if (navBox === null) return;

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (viewport === null) return;
  expect(navBox.y + navBox.height).toBeLessThanOrEqual(viewport.height + 1);

  const mainPaddingBottom = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main === null ? 0 : Number.parseFloat(window.getComputedStyle(main).paddingBottom);
  });
  expect(mainPaddingBottom).toBeGreaterThanOrEqual(Math.min(navBox.height, 56));
}

async function expectSemanticRouteBaseline(page: Page) {
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expectNoDuplicateIds(page);
  await expectAriaLabelledByTargets(page);
  await expectNamedInteractiveControls(page);
  await expectFormControlsHaveLabels(page);
  await expectImagesHaveAlt(page);
  await expectNoNestedInteractive(page);
}

test.describe("Final UX QA — Chromium route and viewport matrix", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Full responsive matrix runs in Chromium.");

  for (const route of ROUTES) {
    test(`${route.label} has stable landmarks, headings, IDs, and accessible controls`, async ({ page }) => {
      await page.goto(route.path);
      await expectSemanticRouteBaseline(page);
    });

    for (const viewport of VIEWPORTS) {
      test(`${route.label} has no document overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(route.path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoDocumentOverflow(page);
        if (MOBILE_WIDTHS.has(viewport.width)) {
          await expectMobileNavClearance(page);
        }
      });
    }
  }
});

test.describe("Final UX QA — shell behavior", () => {
  test("desktop and nested active route states are correct", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/groups/A");
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Groups" })).toHaveAttribute("aria-current", "page");

    await page.goto("/matches/wc2026-group-a-md1-01-mexico-vs-south-africa");
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Matches" })).toHaveAttribute("aria-current", "page");

    await page.goto("/prediction-history");
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Predictions" })).not.toHaveAttribute("aria-current", "page");
  });

  test("skip link is the first keyboard target and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator('a[href="#main-content"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("mobile More popover opens, exposes Model, and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const moreButton = page.getByRole("button", { name: "More" });
    await moreButton.click();
    const menu = page.getByRole("menu", { name: "More destinations" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Model" })).toHaveAttribute("href", "/model");
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

test.describe("Final UX QA — route-specific safeguards", () => {
  test("Tournament shows official fixtures and projected advancement semantics", async ({ page }) => {
    await page.goto("/tournament");

    const roundOf32 = page.locator("#tournament-round-of-32");
    await expect(roundOf32.locator("[data-knockout-fixture]")).toHaveCount(16);
    await expect(roundOf32.getByText("Official fixture")).toHaveCount(16);
    await expect(page.locator('[data-knockout-fixture="73"]').getByTitle("South Africa").first()).toBeVisible();
    await expect(page.locator('[data-knockout-fixture="88"]').getByTitle("Ghana").first()).toBeVisible();
    await expect(page.getByText("Projected after regulation").first()).toBeVisible();
    await expect(page.getByText("Projected to advance").first()).toBeVisible();
    await expect(page.getByText("Advancement:").first()).toBeVisible();
  });

  test("Model related pages link to existing routes", async ({ page }) => {
    await page.goto("/model");
    const related = page.getByRole("navigation", { name: "Related pages" });
    await expect(related.getByRole("link", { name: "Run a prediction" })).toHaveAttribute("href", "/predictions");
    await expect(related.getByRole("link", { name: "Group standings" })).toHaveAttribute("href", "/groups");
    await expect(related.getByRole("link", { name: "Tournament bracket" })).toHaveAttribute("href", "/tournament");
  });
});

test.describe("Final UX QA — focused non-Chromium smoke", () => {
  test.skip(({ browserName }) => browserName === "chromium", "Non-Chromium smoke only.");

  for (const route of ["/", "/matches", "/groups", "/tournament", "/model"] as const) {
    test(`${route} renders shell and one h1`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoDocumentOverflow(page);
    });
  }

  test("mobile More popover and disclosure controls work", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/model");

    const moreButton = page.getByRole("button", { name: "More" });
    await moreButton.click();
    const menu = page.getByRole("menu", { name: "More destinations" });
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    const disclosure = page.locator("details").first();
    await expect(disclosure).not.toHaveAttribute("open", "");
    await disclosure.locator("summary").click();
    await expect(disclosure).toHaveAttribute("open", "");
  });

  test("one prediction interaction remains usable", async ({ page }) => {
    await page.goto("/predictions");
    await expect(page.getByRole("button", { name: "Scheduled World Cup match" })).toBeVisible();
    await page.getByRole("button", { name: "Auto Predict From Elo", exact: true }).click();
    await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();
    await expect(page.getByRole("region", { name: "Mexico vs South Africa" })).toBeVisible();
    await expect(page.getByText("Live Elo auto prediction")).toBeVisible();
  });
});
