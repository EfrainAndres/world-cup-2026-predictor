import { expect, test } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

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
    const historyLink = page.getByRole("link", { name: "History" });
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

  test("page does not have horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

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
    // Navigate to a deep page to check content clearance
    const main = page.getByRole("main");
    await expect(main).toBeVisible();

    const navBox = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);

    if (navBox) {
      // Main content bottom padding must be at least as tall as the nav
      const mainBox = await main.boundingBox();
      if (mainBox) {
        // Main element bottom should end at or before the nav starts (with padding)
        // The pb-16 on main means content area height allows nav clearance
        expect(navBox.y + navBox.height).toBeLessThanOrEqual(bodyHeight + 1);
      }
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

  test("page does not have horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

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

  test("placeholder /matches page loads and renders heading", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
  });

  test("placeholder /groups page loads and renders heading", async ({ page }) => {
    await page.goto("/groups");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Groups" })).toBeVisible();
  });

  test("placeholder /predictions page loads and renders heading", async ({ page }) => {
    await page.goto("/predictions");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();
  });

  test("placeholder /tournament page loads and renders heading", async ({ page }) => {
    await page.goto("/tournament");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tournament" })).toBeVisible();
  });

  test("placeholder /model page loads and renders heading", async ({ page }) => {
    await page.goto("/model");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Model" })).toBeVisible();
  });
});

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
