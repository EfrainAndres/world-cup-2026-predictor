import { expect, test } from "@playwright/test";

// ── Dashboard shell ───────────────────────────────────────────────────────────

test("loads dashboard home with main heading", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "World Cup prediction signals with model limits in view"
    })
  ).toBeVisible();
});

test("main dashboard sections are visible on load", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: "Interactive match simulation" })
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 2, name: "Current model and API evidence" })
  ).toBeVisible();
});

// ── Match simulation form ─────────────────────────────────────────────────────

test("match simulation form renders with required inputs and submit button", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Home team")).toBeVisible();
  await expect(page.getByLabel("Away team")).toBeVisible();
  await expect(page.getByLabel("Expected home goals")).toBeVisible();
  await expect(page.getByLabel("Expected away goals")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeVisible();
});

test("initial simulation results render on page load", async ({ page }) => {
  await page.goto("/");

  // Page server-renders the initial Canada vs Mexico result
  await expect(
    page.getByRole("heading", { name: "Canada vs Mexico" })
  ).toBeVisible();

  await expect(page.getByText("Draw")).toBeVisible();
});

// ── Win/draw/loss probability cards ──────────────────────────────────────────

test("outcome probability cards render with percentage values", async ({ page }) => {
  await page.goto("/");

  const resultsSection = page.getByRole("region", {
    name: "Canada vs Mexico"
  });

  // Three probability articles are inside the results section
  const probabilityCards = resultsSection.getByRole("article");
  await expect(probabilityCards).toHaveCount(3);

  // Each card should show a percentage
  for (const card of await probabilityCards.all()) {
    await expect(card).toContainText("%");
  }
});

// ── Most likely scorelines ────────────────────────────────────────────────────

test("most likely scorelines heading and list are visible", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Most likely scorelines" })
  ).toBeVisible();

  // Scorelines render as a list — at least one item should be present
  const scorelineItems = page
    .getByRole("region", { name: "Canada vs Mexico" })
    .getByRole("list")
    .getByRole("listitem");

  await expect(scorelineItems.first()).toBeVisible();
});

// ── Manual simulation run ─────────────────────────────────────────────────────

test("submitting manual simulation with different teams updates result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Home team").fill("Brazil");
  await page.getByLabel("Away team").fill("Germany");

  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(
    page.getByRole("heading", { name: "Brazil vs Germany" })
  ).toBeVisible();
});

test("manual simulation result shows three probability cards", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Home team").fill("Spain");
  await page.getByLabel("Away team").fill("England");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Spain vs England" });
  await expect(resultsSection.getByRole("article")).toHaveCount(3);
});

// ── Auto Predict From Elo mode ────────────────────────────────────────────────

test("switching to Auto Predict From Elo mode shows Elo info panel", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(
    page.getByText("Expected goals generated from live Elo")
  ).toBeVisible();
});

test("Elo mode preset selector shows all three preset buttons", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(page.getByRole("button", { name: "Conservative" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Balanced" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggressive" })).toBeVisible();
});

// ── Elo mode validation ───────────────────────────────────────────────────────

test("submitting unknown team in Elo mode shows validation alert", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await page.getByLabel("Home team").fill("Unknown Team XYZ");
  await page.getByLabel("Away team").fill("France");

  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Fix the highlighted fields" })
  ).toBeVisible();
});
