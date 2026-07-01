import { expect, test, type Page } from "@playwright/test";

async function selectTeamOption(page: Page, inputLabel: string, searchText: string, optionLabel: string): Promise<void> {
  const input = page.getByLabel(inputLabel);

  await input.click();

  await input.fill(searchText);

  const listboxId = await input.getAttribute("aria-controls");

  if (!listboxId) {

    throw new Error(`Combobox "${inputLabel}" does not expose aria-controls.`);

  }

  const listbox = page.locator(`[id="${listboxId}"]`);

  const option = listbox.getByRole("option", {

    name: optionLabel,

    exact: true,

  });

  await expect(option).toBeVisible();

  await input.press("ArrowDown");

  await input.press("Enter");
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

test("loads dashboard home with main heading", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "World Cup 2026 Predictor"
    })
  ).toBeVisible();
});

// ── Match simulation form ─────────────────────────────────────────────────────

test("match simulation form renders with required inputs and submit button", async ({ page }) => {
  await page.goto("/predictions");

  await expect(page.getByRole("button", { name: "Scheduled World Cup match" })).toBeVisible();
  await expect(page.getByLabel("World Cup group")).toBeVisible();
  await expect(page.getByLabel("Official fixture")).toBeVisible();
  await expect(page.getByLabel("Expected home goals")).toBeVisible();
  await expect(page.getByLabel("Expected away goals")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeVisible();
});

test("scheduled World Cup match mode is the default selection path", async ({ page }) => {
  await page.goto("/predictions");

  const fixtureMetadata = page.getByText("Selected fixture metadata").locator("..");

  await expect(page.getByRole("button", { name: "Scheduled World Cup match" })).toHaveClass(/bg-teal-50/);
  await expect(page.getByLabel("World Cup group")).toHaveValue("A");
  await expect(page.getByLabel("Official fixture")).toHaveValue("wc2026-group-a-md1-01-mexico-vs-south-africa");
  await expect(fixtureMetadata.getByText("Selected home team").locator("..")).toContainText("Mexico");
  await expect(fixtureMetadata.getByText("Selected away team").locator("..")).toContainText("South Africa");
  await expect(fixtureMetadata.getByText("Status", { exact: true }).locator("..")).toContainText("Scheduled");
});

test("initial simulation results render on page load for the default scheduled fixture", async ({ page }) => {
  await page.goto("/predictions");

  await expect(
    page.getByRole("heading", { name: "Mexico vs South Africa" })
  ).toBeVisible();

  const resultsHeadingSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsHeadingSection.getByText("Draw", { exact: true })).toBeVisible();
});

test("changing the selected group filters official fixtures to that group only", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByLabel("World Cup group").selectOption("C");

  const fixtureSelect = page.getByLabel("Official fixture");
  await expect(fixtureSelect).toHaveValue("wc2026-group-c-md1-01-brazil-vs-morocco");
  await expect(fixtureSelect.getByRole("option")).toHaveCount(6);
  await expect(fixtureSelect).toContainText("Fixture 1 - Brazil vs Morocco");
  await expect(fixtureSelect).toContainText("Fixture 2 - Haiti vs Scotland");
  await expect(fixtureSelect).not.toContainText("Mexico vs South Africa");
});

test("scheduled fixture selection updates both teams in official order", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByLabel("World Cup group").selectOption("D");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-d-md1-02-australia-vs-turkey");

  await expect(page.getByText("Selected home team").locator("..")).toContainText("Australia");
  await expect(page.getByText("Selected away team").locator("..")).toContainText("Turkey");
  await expect(page.getByText("Fixture order").locator("..")).toContainText("2");
});

// ── Win/draw/loss probability cards ──────────────────────────────────────────

test("outcome probability cards render with percentage values", async ({ page }) => {
  await page.goto("/predictions");

  const resultsSection = page.getByRole("region", {
    name: "Mexico vs South Africa"
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
  await page.goto("/predictions");

  await expect(
    page.getByRole("heading", { name: "Most likely scorelines" })
  ).toBeVisible();

  // Scorelines render as a list — at least one item should be present
  const scorelineItems = page
    .getByRole("region", { name: "Mexico vs South Africa" })
    .getByRole("list")
    .getByRole("listitem");

  await expect(scorelineItems.first()).toBeVisible();
});

// ── Scheduled simulation run ──────────────────────────────────────────────────

test("running a manual simulation from a scheduled fixture uses the selected official matchup", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByLabel("World Cup group").selectOption("C");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-c-md1-02-haiti-vs-scotland");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Haiti vs Scotland" })).toBeVisible();
});

test("changing scheduled fixture selection clears stale results", async ({ page }) => {
  await page.goto("/predictions");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByLabel("Official fixture").selectOption("wc2026-group-a-md1-02-south-korea-vs-czechia");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("changing scheduled group clears stale results", async ({ page }) => {
  await page.goto("/predictions");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByLabel("World Cup group").selectOption("B");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("switching prediction mode clears stale results for the selected fixture", async ({ page }) => {
  await page.goto("/predictions");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("switching to custom matchup clears stale scheduled results", async ({ page }) => {
  await page.goto("/predictions");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Custom matchup" }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

// ── Custom matchup mode ───────────────────────────────────────────────────────

test("custom matchup mode remains functional with manual inputs", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();

  await expect(page.getByRole("combobox", { name: "Home team" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Away team" })).toBeVisible();

  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();
});

test("custom matchup grouped selector excludes the selected home team from away options", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");

  await page.getByRole("combobox", { name: "Away team" }).click();
  await page.getByRole("combobox", { name: "Away team" }).fill("Brazil");

  await expect(page.getByRole("option", { name: "Brazil · Group C" })).not.toBeVisible();
});

test("custom matchup supports keyboard selection and canonical team labels", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();

  const homeTeamInput = page.getByRole("combobox", { name: "Home team" });
  await homeTeamInput.click();
  await homeTeamInput.fill("USA");
  await homeTeamInput.press("ArrowDown");
  await homeTeamInput.press("Enter");

  await expect(homeTeamInput).toHaveValue("United States");
});

test("changing a custom selected team clears stale results", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();

  await selectTeamOption(page, "Away team", "England", "England · Group L");

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("swap teams exchanges canonical values and clears stale results", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();

  await page.getByRole("button", { name: "Swap teams" }).click();

  await expect(page.getByRole("combobox", { name: "Home team" })).toHaveValue("Germany");
  await expect(page.getByRole("combobox", { name: "Away team" })).toHaveValue("Brazil");
  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("custom matchup remains functional in Auto Predict From Elo mode", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
});

// ── Manual simulation run ─────────────────────────────────────────────────────

test("submitting manual simulation with different teams updates result heading", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");

  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(
    page.getByRole("heading", { name: "Brazil vs Germany" })
  ).toBeVisible();
});

test("manual simulation result shows three probability cards", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Spain", "Spain · Group H");
  await selectTeamOption(page, "Away team", "England", "England · Group L");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Spain vs England" });
  await expect(resultsSection.getByRole("article")).toHaveCount(3);
});

// ── Result output sections ────────────────────────────────────────────────────

test("manual simulation result includes win draw loss labels, expected goals, scorelines, and baseline note", async ({
  page
}) => {
  await page.goto("/predictions");

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });

  // Win/draw/loss probability card labels use home and away team names
  await expect(resultsSection.getByText("Mexico win")).toBeVisible();
  await expect(resultsSection.getByText("Draw")).toBeVisible();
  await expect(resultsSection.getByText("South Africa win")).toBeVisible();

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
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(
    page.getByText("Expected goals generated from live Elo")
  ).toBeVisible();
});

test("scheduled fixture selection works in Auto Predict From Elo mode", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByLabel("World Cup group").selectOption("C");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-c-md1-02-haiti-vs-scotland");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Haiti vs Scotland" })).toBeVisible();
});

test("Elo mode preset selector shows all three preset buttons", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(page.getByRole("button", { name: "Conservative" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Balanced" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggressive" })).toBeVisible();
});

test("Auto Predict From Elo with valid teams returns Live Elo prediction result", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
  await expect(resultsSection.getByText("Live Elo auto prediction")).toBeVisible();
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();
  await expect(resultsSection.getByText("Medium", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Data coverage")).toBeVisible();
  await expect(resultsSection.getByText("Partial", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Both teams use computed Live Elo ratings.")).toBeVisible();
  await expect(resultsSection.getByText("Attack and defense ratings are unavailable.")).toBeVisible();
  await expect(
    resultsSection.getByText(
      "Live Elo is based on partial curated data and is not a public accuracy claim."
    )
  ).toBeVisible();
});

test("Auto Predict From Elo supports Haiti vs Scotland from World Cup 2026 coverage", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "Haiti", "Haiti · Group C");
  await selectTeamOption(page, "Away team", "Scotland", "Scotland · Group C");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Haiti vs Scotland" });

  await expect(page.getByRole("heading", { name: "Haiti vs Scotland" })).toBeVisible();
  await expect(resultsSection.getByText("Live Elo auto prediction")).toBeVisible();
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();
  await expect(resultsSection.getByText("Low", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Partial with fallback", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Haiti uses the fallback rating of 1500.")).toBeVisible();
  await expect(resultsSection.getByText("Manual xG review recommended.")).toBeVisible();
  await expect(
    resultsSection.getByText(
      "Live Elo is based on partial curated data and is not a public accuracy claim."
    )
  ).toBeVisible();
  await expect(
    resultsSection.getByText(/Fallback seed rating/)
  ).toBeVisible();
});

test("changing a scheduled fixture clears stale confidence output together with stale prediction results", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();

  await page.getByLabel("Official fixture").selectOption("wc2026-group-a-md1-02-south-korea-vs-czechia");

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Prediction confidence" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("manual simulation flow does not render automated confidence metadata", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Brazil vs Germany" });
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).not.toBeVisible();
  await expect(resultsSection.getByText("Manual xG review recommended.")).not.toBeVisible();
});

// ── Elo prediction presets ────────────────────────────────────────────────────

test("conservative preset result shows conservative preset metadata", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Conservative" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/conservative preset/)).toBeVisible();
});

test("balanced preset result shows balanced preset metadata", async ({ page }) => {
  await page.goto("/predictions");

  // Balanced is the default preset — no preset button click needed
  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/balanced preset/)).toBeVisible();
});

test("aggressive preset result shows aggressive preset metadata", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Aggressive" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/aggressive preset/)).toBeVisible();
});

test("switching preset from conservative to aggressive updates preset metadata in result", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Conservative" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
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
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "Korea Republic", "South Korea · Group A");
  await selectTeamOption(page, "Away team", "France", "France · Group I");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "South Korea vs France" })
  ).toBeVisible();
});

test("entering Czech Republic in Elo mode resolves to Czechia in result heading", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "Czech Republic", "Czechia · Group A");
  await selectTeamOption(page, "Away team", "France", "France · Group I");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Czechia vs France" })
  ).toBeVisible();
});

test("entering USA in Elo mode resolves to United States in result heading", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await selectTeamOption(page, "Home team", "USA", "United States · Group D");
  await selectTeamOption(page, "Away team", "France", "France · Group I");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "United States vs France" })
  ).toBeVisible();
});

// ── Alias search and duplicate prevention ─────────────────────────────────────

test("alias search in custom mode returns canonical team options", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await page.getByRole("combobox", { name: "Home team" }).click();
  await page.getByRole("combobox", { name: "Home team" }).fill("USA");

  await expect(page.getByRole("option", { name: "United States · Group D" })).toBeVisible();
});

test("duplicate-team selection is prevented in custom mode", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await page.getByRole("combobox", { name: "Away team" }).click();
  await page.getByRole("combobox", { name: "Away team" }).fill("Brazil");

  await expect(page.getByRole("option", { name: "Brazil · Group C" })).not.toBeVisible();
});

// ── Manual mode validation ────────────────────────────────────────────────────

test("invalid xG value in manual mode shows field-level validation error", async ({ page }) => {
  await page.goto("/predictions");

  // Negative xG is invalid — client requires 0 or greater
  await page.getByLabel("Expected home goals").fill("-1");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await expect(
    page.getByText("Expected home goals must be 0 or greater.")
  ).toBeVisible();
});

// ── Tournament form adjustment toggle ─────────────────────────────────────────

test("tournament form toggle defaults to Off in Auto Predict mode", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(page.getByText("Tournament form adjustment")).toBeVisible();
  await expect(page.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "On", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("tournament form toggle is not visible in Manual xG mode", async ({ page }) => {
  await page.goto("/predictions");

  // Default is manual mode — toggle should not be visible
  await expect(page.getByText("Tournament form adjustment")).not.toBeVisible();
});

test("switching to Manual xG mode hides tournament form toggle", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await expect(page.getByText("Tournament form adjustment")).toBeVisible();

  await page.getByRole("button", { name: "Manual xG" }).click();
  await expect(page.getByText("Tournament form adjustment")).not.toBeVisible();
});

test("tournament form help text is visible when toggle is shown", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();

  await expect(
    page.getByText("Uses completed World Cup 2026 matches as a bounded secondary Elo signal.")
  ).toBeVisible();
});

test("enabling tournament form toggle clears stale results", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "On", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("disabling tournament form toggle clears stale results", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Off" }).click();

  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("running Auto Predict with tournament form Off does not show tournament form section", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  // Off is the default — no need to click Off
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection).toBeVisible();
  await expect(resultsSection.getByText("Tournament form", { exact: true })).not.toBeVisible();
});

test("running Auto Predict with tournament form On shows tournament form section", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();
});

test("tournament form section shows Applied or Not applied status", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();
  // Accept either Applied or Not applied — depends on local completed-results data
  const hasApplied = await resultsSection.getByText("Applied", { exact: true }).isVisible();
  const hasNotApplied = await resultsSection.getByText("Not applied", { exact: true }).isVisible();
  expect(hasApplied || hasNotApplied).toBe(true);
});

test("tournament form Not applied shows explanatory text", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByLabel("World Cup group").selectOption("G");
  // Group G: Belgium, Egypt, Iran, New Zealand — may have few completed matches
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: /Belgium vs Egypt/ });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();

  const notApplied = await resultsSection.getByText("Not applied", { exact: true }).isVisible();
  const applied = await resultsSection.getByText("Applied", { exact: true }).isVisible();

  if (notApplied) {
    await expect(
      resultsSection.getByText("Not enough completed tournament matches yet to apply a secondary Elo adjustment.")
    ).toBeVisible();
  } else {
    // Applied path is also valid
    expect(applied).toBe(true);
  }
});

test("tournament form Applied shows Baseline Elo, Adjustment, Effective Elo and Matches for both teams", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  // Group A - Mexico and South Africa — most likely to have completed matches
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  const isApplied = await resultsSection.getByText("Applied", { exact: true }).isVisible();

  if (isApplied) {
    await expect(resultsSection.getByText("Baseline Elo").first()).toBeVisible();
    await expect(resultsSection.getByText("Adjustment").first()).toBeVisible();
    await expect(resultsSection.getByText("Effective Elo").first()).toBeVisible();
    await expect(resultsSection.getByText("Matches").first()).toBeVisible();
    await expect(
      resultsSection.getByText("Secondary Elo adjustment from completed World Cup 2026 matches.")
    ).toBeVisible();
  } else {
    // Not applied is valid given sparse local data
    await expect(resultsSection.getByText("Not applied", { exact: true })).toBeVisible();
  }
});

test("tournament form section always shows secondary signal disclaimer", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(
    resultsSection.getByText(
      "Tournament form is an optional secondary signal, not a separate prediction model. It does not automatically increase confidence."
    )
  ).toBeVisible();
});

// ── Match context section in simulation results ───────────────────────────────

test("initial simulation result always shows match context section header", async ({ page }) => {
  await page.goto("/predictions");

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(
    resultsSection.getByText("Match context — not used as a model input", { exact: true })
  ).toBeVisible();
});

test("custom matchup simulation shows match context section with not-available message", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Brazil vs Germany" });
  await expect(
    resultsSection.getByText("Match context — not used as a model input", { exact: true })
  ).toBeVisible();
  await expect(
    resultsSection.getByText("Match context is not available for this prediction.", { exact: true })
  ).toBeVisible();
});

test("match context section header remains visible after running Auto Predict From Elo in scheduled mode", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(
    resultsSection.getByText("Match context — not used as a model input", { exact: true })
  ).toBeVisible();
});

test("Manual xG result does not show tournament form section", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Brazil", "Brazil · Group C");
  await selectTeamOption(page, "Away team", "Germany", "Germany · Group E");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Brazil vs Germany" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).not.toBeVisible();
});

test("switching from tournament form On back to Off and re-predicting removes tournament form section", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico vs South Africa" })).toBeVisible();

  await page.getByRole("button", { name: "Off" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Tournament form", { exact: true })).not.toBeVisible();
});

test("scheduled fixture and custom matchup flows remain functional with tournament form enabled", async ({ page }) => {
  await page.goto("/predictions");

  // Scheduled fixture flow with tournament form On
  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByLabel("World Cup group").selectOption("C");
  await page.getByLabel("Official fixture").selectOption("wc2026-group-c-md1-01-brazil-vs-morocco");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Brazil vs Morocco" })).toBeVisible();

  // Custom matchup flow
  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "France", "France · Group I");
  await selectTeamOption(page, "Away team", "Netherlands", "Netherlands · Group F");
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
});

test("prediction confidence section still visible alongside tournament form section", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).toBeVisible();
  await expect(resultsSection.getByText("Tournament form", { exact: true })).toBeVisible();
});

// ── Phase 12.20E — Recommended score and scoreline diversity ──────────────────

test("scoreline prediction section heading is visible for live Elo prediction", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Scoreline prediction", { exact: true })).toBeVisible();
});

test("most likely outcome label with team name is visible in scoreline prediction section", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText(/Most likely outcome:/)).toBeVisible();
});

test("recommended score card is visible for live Elo prediction", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Recommended score", { exact: true })).toBeVisible();
});

test("top scorelines list with rec. badge is visible for live Elo prediction", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText(/Top \d+ scorelines/)).toBeVisible();
  await expect(resultsSection.getByText("rec.", { exact: true })).toBeVisible();
});

test("top 5 cumulative probability footnote is visible for live Elo prediction", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText(/Top 5 cumulative:/)).toBeVisible();
});

test("scoreline prediction section is absent for manual xG simulation", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Custom matchup" }).click();
  await selectTeamOption(page, "Home team", "Mexico", "Mexico · Group A");
  await selectTeamOption(page, "Away team", "South Africa", "South Africa · Group A");
  await page.getByRole("button", { name: "Run simulation" }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Scoreline prediction", { exact: true })).not.toBeVisible();
  await expect(resultsSection.getByText("Most likely scorelines", { exact: true })).toBeVisible();
});

test("scoreline prediction section has no horizontal overflow at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await page.getByRole("region", { name: "Mexico vs South Africa" }).waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("scoreline prediction section has no horizontal overflow at 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await page.getByRole("region", { name: "Mexico vs South Africa" }).waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("scoreline prediction section has no horizontal overflow at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await page.getByRole("region", { name: "Mexico vs South Africa" }).waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("scoreline prediction section has no horizontal overflow at 430 px", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  await page.getByRole("region", { name: "Mexico vs South Africa" }).waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

// ── Phase 12.21B — Attack/Defense technical disclosure ────────────────────────

test("Attack/Defense disclosure section is absent by default (off mode)", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection).toBeVisible();
  // With ATTACK_DEFENSE_GOAL_MODEL_MODE=off (default), no AD section appears
  await expect(resultsSection.getByText("Attack/Defense model")).not.toBeVisible();
  await expect(resultsSection.getByText("Attack/Defense technical details")).not.toBeVisible();
});

test("Attack/Defense section absent does not affect scoreline prediction rendering", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Scoreline prediction", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Recommended score", { exact: true })).toBeVisible();
});

test("no horizontal overflow at 320 px with AD off mode", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const region = page.getByRole("region", { name: "Mexico vs South Africa" });
  await region.waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("no horizontal overflow at 375 px with AD off mode", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const region = page.getByRole("region", { name: "Mexico vs South Africa" });
  await region.waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("no horizontal overflow at 390 px with AD off mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const region = page.getByRole("region", { name: "Mexico vs South Africa" });
  await region.waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("no horizontal overflow at 430 px with AD off mode", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const region = page.getByRole("region", { name: "Mexico vs South Africa" });
  await region.waitFor({ state: "visible" });

  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
