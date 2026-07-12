import { expect, type Locator, type Page } from "@playwright/test";
import type { PredictionTeam } from "../data/prediction-test-data";

export type PredictionPreset = "Conservative" | "Balanced" | "Aggressive";

export class PredictionsPage {
  readonly scheduledMatchModeButton: Locator;
  readonly customMatchupModeButton: Locator;
  readonly autoPredictModeButton: Locator;
  readonly manualXgModeButton: Locator;
  readonly worldCupGroupSelect: Locator;
  readonly officialFixtureSelect: Locator;
  readonly expectedHomeGoalsInput: Locator;
  readonly expectedAwayGoalsInput: Locator;
  readonly runSimulationButton: Locator;
  readonly runAutoPredictButton: Locator;
  readonly swapTeamsButton: Locator;
  readonly predictionUnavailableMessage: Locator;

  constructor(readonly page: Page) {
    this.scheduledMatchModeButton = page.getByRole("button", { name: "Scheduled World Cup match" });
    this.customMatchupModeButton = page.getByRole("button", { name: "Custom matchup" });
    this.autoPredictModeButton = page.getByRole("button", { name: "Auto Predict From Elo", exact: true });
    this.manualXgModeButton = page.getByRole("button", { name: "Manual xG" });
    this.worldCupGroupSelect = page.getByLabel("World Cup group");
    this.officialFixtureSelect = page.getByLabel("Official fixture");
    this.expectedHomeGoalsInput = page.getByLabel("Expected home goals");
    this.expectedAwayGoalsInput = page.getByLabel("Expected away goals");
    this.runSimulationButton = page.getByRole("button", { name: "Run simulation" });
    this.runAutoPredictButton = page.getByRole("button", { name: "Auto predict from Elo", exact: true });
    this.swapTeamsButton = page.getByRole("button", { name: "Swap teams" });
    this.predictionUnavailableMessage = page.getByText("Prediction unavailable");
  }

  async goto(): Promise<void> {
    await this.page.goto("/predictions");
  }

  resultRegion(matchupName: string | RegExp): Locator {
    return this.page.getByRole("region", { name: matchupName });
  }

  resultHeading(matchupName: string): Locator {
    return this.page.getByRole("heading", { name: matchupName });
  }

  selectedMetadataTerm(term: string): Locator {
    return this.page.getByText(term, { exact: true }).locator("..");
  }

  presetButton(preset: PredictionPreset): Locator {
    return this.page.getByRole("button", { name: preset });
  }

  tournamentFormButton(state: "On" | "Off"): Locator {
    return this.page.getByRole("button", { name: state, exact: state === "On" });
  }

  async switchToCustomMatchup(): Promise<void> {
    await this.customMatchupModeButton.click();
  }

  async switchToAutoPredict(): Promise<void> {
    await this.autoPredictModeButton.click();
  }

  async switchToManualXg(): Promise<void> {
    await this.manualXgModeButton.click();
  }

  async selectWorldCupGroup(group: string): Promise<void> {
    await this.worldCupGroupSelect.selectOption(group);
  }

  async selectOfficialFixture(fixtureId: string): Promise<void> {
    await this.officialFixtureSelect.selectOption(fixtureId);
  }

  async selectPreset(preset: PredictionPreset): Promise<void> {
    await this.presetButton(preset).click();
  }

  async setTournamentForm(state: "On" | "Off"): Promise<void> {
    await this.tournamentFormButton(state).click();
  }

  async runSimulation(): Promise<void> {
    await this.runSimulationButton.click();
  }

  async runAutoPredict(): Promise<void> {
    await this.runAutoPredictButton.click();
  }

  async expectNoHorizontalOverflow(): Promise<void> {
    const scrollWidth = await this.page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await this.page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  }

  async fillInvalidHomeExpectedGoals(value: string): Promise<void> {
    await this.expectedHomeGoalsInput.fill(value);
  }
}

export type TeamPair = {
  home: PredictionTeam;
  away: PredictionTeam;
};
