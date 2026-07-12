import { expect, test } from "../fixtures/test.fixture";
import { TEAM_SELECT_RESELECTION_STABILIZATION_MS } from "../components/searchable-team-select.component";
import {
  mobileViewports,
  predictionFixtures,
  predictionGroups,
  predictionTeams
} from "../data/prediction-test-data";

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

test("custom matchup mode remains functional with manual inputs", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();

  await expect(page.getByRole("combobox", { name: "Home team" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Away team" })).toBeVisible();

  await predictionFlow.selectTeams({ home: predictionTeams.brazil, away: predictionTeams.germany });
  await predictionsPage.runSimulation();

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();
});

test("custom matchup grouped selector excludes the selected home team from away options", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect,
  awayTeamSelect
}) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();
  await homeTeamSelect.select(predictionTeams.brazil);

  await awayTeamSelect.search("Brazil");

  await expect(page.getByRole("option", { name: "Brazil · Group C" })).not.toBeVisible();
});

test("custom matchup supports keyboard selection and canonical team labels", async ({ predictionsPage, predictionFlow, homeTeamSelect }) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();
  await homeTeamSelect.selectByKeyboard("USA", "United States");

  await expect(homeTeamSelect.input).toHaveValue("United States");
});

// ── SearchableTeamSelect selection UX (Phase 5: mobile combobox fix) ──────────

test("dropdown closes and selected value is visible immediately after a pointer selection", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect
}) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();
  await homeTeamSelect.select(predictionTeams.brazil);

  // No further interaction (no tap-elsewhere) — the value and closed state
  // must already be correct at this point.
  await expect(homeTeamSelect.input).toHaveValue("Brazil");
  await expect(homeTeamSelect.input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("dropdown does not reopen on its own shortly after a pointer selection", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect
}) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();
  await homeTeamSelect.select(predictionTeams.brazil);

  // Give any stray reopen/refocus a window to occur, then assert the list
  // is still closed and the confirmed value is still showing.
  await homeTeamSelect.stabilizeAfterSelection();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(homeTeamSelect.input).toHaveValue("Brazil");
  await expect(homeTeamSelect.input).toHaveAttribute("aria-expanded", "false");
});

test("keyboard Enter selection closes the dropdown and confirms the value", async ({ page, predictionsPage, predictionFlow, homeTeamSelect }) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();
  await homeTeamSelect.selectByKeyboard("USA", "United States");

  await expect(homeTeamSelect.input).toHaveValue("United States");
  await expect(homeTeamSelect.input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("Escape closes the dropdown without selecting a team", async ({ page }) => {
  await page.goto("/predictions");
  await page.getByRole("button", { name: "Custom matchup" }).click();

  const homeTeamInput = page.getByRole("combobox", { name: "Home team" });
  // Custom matchup mode starts pre-filled with the previously scheduled team
  // (Mexico by default). Escape must restore that existing value, not clear it.
  await expect(homeTeamInput).toHaveValue("Mexico");
  await homeTeamInput.click();
  await homeTeamInput.fill("Braz");
  await expect(page.getByRole("listbox")).toBeVisible();

  await homeTeamInput.press("Escape");

  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(homeTeamInput).toHaveAttribute("aria-expanded", "false");
  await expect(homeTeamInput).toHaveValue("Mexico");
});

test("Tab after a keyboard selection moves focus to the next field, not back to the top of the page", async ({ page }) => {
  await page.goto("/predictions");
  await page.getByRole("button", { name: "Custom matchup" }).click();

  const homeTeamInput = page.getByRole("combobox", { name: "Home team" });
  await homeTeamInput.click();
  await homeTeamInput.fill("Brazil");
  await homeTeamInput.press("ArrowDown");
  await homeTeamInput.press("Enter");

  await expect(homeTeamInput).toHaveValue("Brazil");

  await page.keyboard.press("Tab");

  await expect(page.getByRole("button", { name: "Swap teams" })).toBeFocused();
});

test("reopening the combobox after a selection still works (intentional refocus is not blocked)", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect
}) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();
  await homeTeamSelect.select(predictionTeams.brazil);

  // Wait past the short reopen-guard window so this exercises a genuine,
  // later, user-intentional re-tap rather than an immediate accidental bounce
  // (which the previous test already asserts must NOT reopen the list).
  await page.waitForTimeout(TEAM_SELECT_RESELECTION_STABILIZATION_MS);

  await homeTeamSelect.input.click();

  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(homeTeamSelect.input).toHaveAttribute("aria-expanded", "true");
});

test("changing a custom selected team clears stale results", async ({
  page,
  predictionsPage,
  predictionFlow,
  awayTeamSelect
}) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({ home: predictionTeams.brazil, away: predictionTeams.germany });

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();

  await awayTeamSelect.select(predictionTeams.england);

  await expect(awayTeamSelect.input).toHaveValue("England");
  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("swap teams exchanges canonical values and clears stale results", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect,
  awayTeamSelect
}) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({ home: predictionTeams.brazil, away: predictionTeams.germany });

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();

  await predictionsPage.swapTeamsButton.click();

  await expect(homeTeamSelect.input).toHaveValue("Germany");
  await expect(awayTeamSelect.input).toHaveValue("Brazil");
  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).not.toBeVisible();
  await expect(page.getByText("Prediction unavailable")).toBeVisible();
});

test("custom matchup remains functional in Auto Predict From Elo mode", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({ home: predictionTeams.france, away: predictionTeams.netherlands });

  await expect(page.getByRole("heading", { name: "France vs Netherlands" })).toBeVisible();
});

// ── Manual simulation run ─────────────────────────────────────────────────────

test("submitting manual simulation with different teams updates result heading", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({ home: predictionTeams.brazil, away: predictionTeams.germany });

  await expect(
    page.getByRole("heading", { name: "Brazil vs Germany" })
  ).toBeVisible();
});

test("manual simulation result shows three probability cards", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({ home: predictionTeams.spain, away: predictionTeams.england });

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

test("Auto Predict From Elo with valid teams returns Live Elo prediction result", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({ home: predictionTeams.france, away: predictionTeams.netherlands });

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

test("Auto Predict From Elo supports Haiti vs Scotland from World Cup 2026 coverage", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({ home: predictionTeams.haiti, away: predictionTeams.scotland });

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

test("manual simulation flow does not render automated confidence metadata", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({ home: predictionTeams.brazil, away: predictionTeams.germany });

  const resultsSection = page.getByRole("region", { name: "Brazil vs Germany" });
  await expect(resultsSection.getByRole("heading", { name: "Prediction confidence" })).not.toBeVisible();
  await expect(resultsSection.getByText("Manual xG review recommended.")).not.toBeVisible();
});

// ── Elo prediction presets ────────────────────────────────────────────────────

test("conservative preset result shows conservative preset metadata", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({
    home: predictionTeams.france,
    away: predictionTeams.netherlands,
    preset: "Conservative"
  });

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/conservative preset/)).toBeVisible();
});

test("balanced preset result shows balanced preset metadata", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({ home: predictionTeams.france, away: predictionTeams.netherlands });

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/balanced preset/)).toBeVisible();
});

test("aggressive preset result shows aggressive preset metadata", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({
    home: predictionTeams.france,
    away: predictionTeams.netherlands,
    preset: "Aggressive"
  });

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/aggressive preset/)).toBeVisible();
});

test("switching preset from conservative to aggressive updates preset metadata in result", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({
    home: predictionTeams.france,
    away: predictionTeams.netherlands,
    preset: "Conservative"
  });

  const resultsSection = page.getByRole("region", { name: "France vs Netherlands" });
  await expect(resultsSection.getByText(/conservative preset/)).toBeVisible();

  // Switch to aggressive and re-submit with the same teams
  await predictionsPage.selectPreset("Aggressive");
  await predictionsPage.runAutoPredict();

  await expect(resultsSection.getByText(/aggressive preset/)).toBeVisible();
  await expect(resultsSection.getByText(/conservative preset/)).not.toBeVisible();
});

// ── Team aliases ──────────────────────────────────────────────────────────────

test("entering Korea Republic in Elo mode resolves to South Korea in result heading", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({ home: predictionTeams.southKorea, away: predictionTeams.france });

  await expect(
    page.getByRole("heading", { name: "South Korea vs France" })
  ).toBeVisible();
});

test("entering Czech Republic in Elo mode resolves to Czechia in result heading", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({ home: predictionTeams.czechia, away: predictionTeams.france });

  await expect(
    page.getByRole("heading", { name: "Czechia vs France" })
  ).toBeVisible();
});

test("entering USA in Elo mode resolves to United States in result heading", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createAutoPrediction({ home: predictionTeams.unitedStates, away: predictionTeams.france });

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

test("duplicate-team selection is prevented in custom mode", async ({ page, predictionsPage, predictionFlow, homeTeamSelect, awayTeamSelect }) => {
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();
  await homeTeamSelect.select(predictionTeams.brazil);
  await awayTeamSelect.search("Brazil");

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

test("custom matchup simulation shows match context section with not-available message", async ({
  page,
  predictionsPage,
  predictionFlow
}) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({ home: predictionTeams.brazil, away: predictionTeams.germany });

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

test("Manual xG result does not show tournament form section", async ({ page, predictionsPage, predictionFlow }) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({ home: predictionTeams.brazil, away: predictionTeams.germany });

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

test("scheduled fixture and custom matchup flows remain functional with tournament form enabled", async ({
  page,
  predictionsPage,
  predictionFlow
}) => {
  await predictionsPage.goto();

  // Scheduled fixture flow with tournament form On
  await predictionFlow.runScheduledAutoPrediction({
    tournamentForm: "On",
    group: predictionGroups.c,
    fixtureId: predictionFixtures.brazilMorocco
  });

  await expect(page.getByRole("heading", { name: "Brazil vs Morocco" })).toBeVisible();

  // Custom matchup flow
  await predictionFlow.createAutoPrediction({
    home: predictionTeams.france,
    away: predictionTeams.netherlands
  });

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

test("scoreline prediction section is absent for manual xG simulation", async ({
  page,
  predictionsPage,
  predictionFlow
}) => {
  await predictionsPage.goto();
  await predictionFlow.createManualPrediction({
    home: predictionTeams.mexico,
    away: predictionTeams.southAfrica
  });

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

test("Attack/Defense off-mode metadata remains visible while Elo V2 stays authoritative @smoke", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection).toBeVisible();
  await expect(resultsSection.getByText("Attack/Defense model", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Baseline Elo V2", { exact: true })).toBeVisible();
  await expect(resultsSection.getByText("Mode", { exact: true }).locator("..")).toContainText("Off");
  await expect(resultsSection.getByText("Applied", { exact: true }).locator("..")).toContainText("No");
  await expect(resultsSection.getByText("Stage authoritative", { exact: true }).first().locator("..")).toContainText("No");
  await expect(resultsSection.getByText("Final authoritative", { exact: true }).first().locator("..")).toContainText("No");
  await expect(resultsSection.getByText("Attack/Defense did not affect this prediction: Disabled.")).toBeVisible();
  await expect(resultsSection.getByLabel("Prediction pipeline: Elo V2")).toBeVisible();
});

test("Attack/Defense off-mode metadata does not affect scoreline prediction rendering", async ({ page }) => {
  await page.goto("/predictions");

  await page.getByRole("button", { name: "Auto Predict From Elo" }).click();
  await page.getByRole("button", { name: "Auto predict from Elo", exact: true }).click();

  const resultsSection = page.getByRole("region", { name: "Mexico vs South Africa" });
  await expect(resultsSection.getByText("Baseline Elo V2", { exact: true })).toBeVisible();
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

// ── Mobile Custom matchup combobox UX (Phase 5) — iPhone 12 Pro Max ───────────
// Reported by manual QA: the Home/Away team combobox could remain open, or
// close and immediately reopen, after a mobile tap selection.

test("mobile: selecting Home team closes the dropdown and shows the confirmed value", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect
}) => {
  await page.setViewportSize(mobileViewports.iPhone12ProMax);
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();

  await homeTeamSelect.select(predictionTeams.brazil);

  await expect(homeTeamSelect.input).toHaveValue("Brazil");
  await expect(homeTeamSelect.input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("mobile: selecting Away team closes the dropdown and shows the confirmed value", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect,
  awayTeamSelect
}) => {
  await page.setViewportSize(mobileViewports.iPhone12ProMax);
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();

  await homeTeamSelect.select(predictionTeams.brazil);
  await awayTeamSelect.select(predictionTeams.germany);

  await expect(awayTeamSelect.input).toHaveValue("Germany");
  await expect(awayTeamSelect.input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("mobile: dropdown does not reopen on its own after selecting either team", async ({
  page,
  predictionsPage,
  predictionFlow,
  homeTeamSelect,
  awayTeamSelect
}) => {
  await page.setViewportSize(mobileViewports.iPhone12ProMax);
  await predictionsPage.goto();
  await predictionFlow.openCustomMatchup();

  await homeTeamSelect.select(predictionTeams.brazil);
  await awayTeamSelect.select(predictionTeams.germany);
  await awayTeamSelect.stabilizeAfterSelection();

  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(homeTeamSelect.input).toHaveValue("Brazil");
  await expect(awayTeamSelect.input).toHaveValue("Germany");
});

test("mobile: no horizontal overflow on Custom matchup after selecting both teams", async ({
  page,
  predictionsPage,
  predictionFlow
}) => {
  await page.setViewportSize(mobileViewports.iPhone12ProMax);
  await predictionsPage.goto();

  await predictionFlow.openCustomMatchup();
  await predictionFlow.selectTeams({ home: predictionTeams.brazil, away: predictionTeams.germany });

  await predictionsPage.expectNoHorizontalOverflow();
});

test("mobile: running a prediction still works after selecting teams via the combobox", async ({
  page,
  predictionsPage,
  predictionFlow
}) => {
  await page.setViewportSize(mobileViewports.iPhone12ProMax);
  await predictionsPage.goto();

  await predictionFlow.createManualPrediction({ home: predictionTeams.brazil, away: predictionTeams.germany });

  await expect(page.getByRole("heading", { name: "Brazil vs Germany" })).toBeVisible();
});
