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

test("dashboard renders World Cup 2026 groups and Group C fixtures", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: "World Cup 2026 Groups & Fixtures" })
  ).toBeVisible();
  const groupsSection = page.getByRole("region", { name: "World Cup 2026 Groups & Fixtures" });
  await expect(groupsSection.getByText("Foundation tournament structure")).toBeVisible();
  await expect(groupsSection.getByText("72 group fixtures")).toBeVisible();
  await expect(groupsSection.getByText("12 groups")).toBeVisible();

  const groupC = groupsSection.getByRole("article", { name: "Group C" });
  await expect(groupC).toBeVisible();
  await expect(groupC.getByText("Brazil", { exact: true })).toBeVisible();
  await expect(groupC.getByText("Morocco", { exact: true })).toBeVisible();
  await expect(groupC.getByText("Haiti", { exact: true })).toBeVisible();
  await expect(groupC.getByText("Scotland", { exact: true })).toBeVisible();
});

test("dashboard renders World Cup 2026 group standings tables", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: "World Cup 2026 Group Standings" })
  ).toBeVisible();
  await expect(page.getByText("Foundation standings")).toBeVisible();
  await expect(page.getByText("Results source: local static provider")).toBeVisible();
  await expect(page.getByText("External provider: disabled")).toBeVisible();
  await expect(page.getByText("Standings are calculated from local normalized results. Scheduled matches are ignored.")).toBeVisible();

  const groupA = page.getByRole("article", { name: "Group A standings" });
  const groupC = page.getByRole("article", { name: "Group C standings" });

  await expect(groupA).toBeVisible();
  await expect(groupA.getByRole("row", { name: /Mexico/ })).toContainText("3");
  await expect(groupC).toBeVisible();
  await expect(groupC.getByRole("row", { name: /Scotland/ })).toContainText("3");
});

test("dashboard renders projected World Cup 2026 Round of 32 foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected Round of 32" })).toBeVisible();
  const roundOf32Section = page.getByRole("region", { name: "Projected Round of 32" });
  await expect(roundOf32Section.getByText("Round of 32 foundation", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("Qualified teams")).toBeVisible();
  await expect(roundOf32Section.getByText("32", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("Fixtures", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("16", { exact: true })).toBeVisible();
  await expect(roundOf32Section.getByRole("article", { name: "Round of 32 fixture 1", exact: true })).toBeVisible();
  await expect(roundOf32Section.getByText("Projected Round of 32 foundation based on current local standings.")).toBeVisible();
});

test("dashboard renders Round of 32 knockout match simulations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Round of 32 match simulations" })).toBeVisible();
  const simSection = page.getByRole("region", { name: "Round of 32 match simulations" });
  await expect(simSection.getByText("Match probabilities only", { exact: true })).toBeVisible();
  await expect(page.getByText("Slot 1").first()).toBeVisible();
  await expect(page.getByText(/Draw: \d+\.\d+%/).first()).toBeVisible();
});

test("dashboard renders projected knockout bracket with all rounds", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Projected knockout bracket" })).toBeVisible();
  const bracketSection = page.getByRole("region", { name: "Projected knockout bracket" });
  await expect(bracketSection.getByText("Projected bracket only")).toBeVisible();
  await expect(bracketSection.getByText("Round of 32", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Round of 16", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Quarterfinals", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Semifinals", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Third Place", { exact: true })).toBeVisible();
  await expect(bracketSection.getByText("Final", { exact: true })).toBeVisible();
  await expect(page.getByText("Winner R32-01").first()).toBeVisible();
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

  const resultsHeadingSection = page.getByRole("region", { name: "Canada vs Mexico" });
  await expect(resultsHeadingSection.getByText("Draw", { exact: true })).toBeVisible();
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

// ── Result output sections ────────────────────────────────────────────────────

test("manual simulation result includes win draw loss labels, expected goals, scorelines, and baseline note", async ({
  page
}) => {
  await page.goto("/");

  const resultsSection = page.getByRole("region", { name: "Canada vs Mexico" });

  // Win/draw/loss probability card labels use home and away team names
  await expect(resultsSection.getByText("Canada win")).toBeVisible();
  await expect(resultsSection.getByText("Draw")).toBeVisible();
  await expect(resultsSection.getByText("Mexico win")).toBeVisible();

  // Expected goals metadata terms
  await expect(resultsSection.getByText("Expected home goals")).toBeVisible();
  await expect(resultsSection.getByText("Expected away goals")).toBeVisible();

  // Most likely scorelines section heading
  await expect(
    resultsSection.getByRole("heading", { name: "Most likely scorelines" })
  ).toBeVisible();

  // Baseline simulation disclaimer
  await expect(
    resultsSection.getByText("Baseline simulation, not a guarantee.")
  ).toBeVisible();
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

test("Auto Predict From Elo with valid teams returns Live Elo prediction result", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("Home team").fill("France");
  await page.getByLabel("Away team").fill("Netherlands");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
  await expect(resultsSection.getByText("Live Elo auto prediction")).toBeVisible();
  await expect(
    resultsSection.getByText(
      "Live Elo is based on partial curated data and is not a public accuracy claim."
    )
  ).toBeVisible();
});

test("Auto Predict From Elo supports Haiti vs Scotland from World Cup 2026 coverage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("Home team").fill("Haiti");
  await page.getByLabel("Away team").fill("Scotland");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Haiti vs Scotland" });

  await expect(page.getByRole("heading", { name: "Haiti vs Scotland" })).toBeVisible();
  await expect(resultsSection.getByText("Live Elo auto prediction")).toBeVisible();
  await expect(
    resultsSection.getByText(
      "Live Elo is based on partial curated data and is not a public accuracy claim."
    )
  ).toBeVisible();
  await expect(
    resultsSection.getByText(/Fallback seed rating/)
  ).toBeVisible();
});

// ── Elo prediction presets ────────────────────────────────────────────────────

test("conservative preset result shows conservative preset metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Conservative" }).click();
  await page.getByLabel("Home team").fill("France");
  await page.getByLabel("Away team").fill("Netherlands");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/conservative preset/)).toBeVisible();
});

test("balanced preset result shows balanced preset metadata", async ({ page }) => {
  await page.goto("/");

  // Balanced is the default preset — no preset button click needed
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("Home team").fill("France");
  await page.getByLabel("Away team").fill("Netherlands");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/balanced preset/)).toBeVisible();
});

test("aggressive preset result shows aggressive preset metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Aggressive" }).click();
  await page.getByLabel("Home team").fill("France");
  await page.getByLabel("Away team").fill("Netherlands");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/aggressive preset/)).toBeVisible();
});

test("switching preset from conservative to aggressive updates preset metadata in result", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Conservative" }).click();
  await page.getByLabel("Home team").fill("France");
  await page.getByLabel("Away team").fill("Netherlands");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/conservative preset/)).toBeVisible();

  // Switch to aggressive and re-submit with the same teams
  await page.getByRole("button", { name: "Aggressive" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(resultsSection.getByText(/aggressive preset/)).toBeVisible();
  await expect(resultsSection.getByText(/conservative preset/)).not.toBeVisible();
});

// ── Team aliases ──────────────────────────────────────────────────────────────

test("entering Korea Republic in Elo mode resolves to South Korea in result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("Home team").fill("Korea Republic");
  await page.getByLabel("Away team").fill("France");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "South Korea vs France" })
  ).toBeVisible();
});

test("entering Czech Republic in Elo mode resolves to Czechia in result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("Home team").fill("Czech Republic");
  await page.getByLabel("Away team").fill("France");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Czechia vs France" })
  ).toBeVisible();
});

test("entering USA in Elo mode resolves to United States in result heading", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("Home team").fill("USA");
  await page.getByLabel("Away team").fill("France");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "United States vs France" })
  ).toBeVisible();
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

test("unavailable team in Elo mode shows field error with suggestions", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  // "Franc" is close to "France" — the suggestion engine should surface it
  await page.getByLabel("Home team").fill("Franc");
  await page.getByLabel("Away team").fill("Netherlands");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByText(/Suggestions:/)).toBeVisible();
});

// ── Stale result clearing ─────────────────────────────────────────────────────

test("stale result is cleared and empty state is shown when validation fails after a valid prediction", async ({
  page
}) => {
  await page.goto("/");

  // Run a valid Auto Predict From Elo prediction first
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("Home team").fill("France");
  await page.getByLabel("Away team").fill("Netherlands");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  // Confirm result heading appears
  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();

  // Change to an unavailable team and re-submit
  await page.getByLabel("Home team").fill("Unknown Team XYZ");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  // Validation alert must appear
  await expect(
    page.getByRole("alert").filter({ hasText: "Fix the highlighted fields" })
  ).toBeVisible();

  // Stale result heading must be gone and empty state must be visible
  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

// ── Manual mode validation ────────────────────────────────────────────────────

test("invalid xG value in manual mode shows field-level validation error", async ({ page }) => {
  await page.goto("/");

  // Negative xG is invalid — client requires 0 or greater
  await page.getByLabel("Expected home goals").fill("-1");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(
    page.getByText("Expected home goals must be 0 or greater.")
  ).toBeVisible();
});
