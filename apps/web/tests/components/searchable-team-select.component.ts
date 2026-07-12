import { expect, type Locator, type Page } from "@playwright/test";
import type { PredictionTeam } from "../data/prediction-test-data";

// SearchableTeamSelect has a 150ms just-selected guard and a 100ms blur-close
// timer. Waiting past both timers prevents immediate same-combobox reselection
// from racing a stale close/reset timer left over from pointer selection.
export const TEAM_SELECT_RESELECTION_STABILIZATION_MS = 300;

export class SearchableTeamSelect {
  readonly input: Locator;
  readonly listbox: Locator;

  constructor(
    private readonly page: Page,
    readonly label: "Home team" | "Away team"
  ) {
    this.input = page.getByRole("combobox", { name: label });
    this.listbox = page.getByRole("listbox");
  }

  option(optionLabel: string): Locator {
    return this.listbox.getByRole("option", { name: optionLabel, exact: true });
  }

  async open(): Promise<void> {
    await this.input.click();
    await expect(this.listbox).toBeVisible();
  }

  async search(searchText: string): Promise<void> {
    await this.input.click();
    await this.input.fill("");
    await this.input.fill(searchText);
    await expect(this.listbox).toBeVisible();
  }

  async select(team: PredictionTeam): Promise<void> {
    await this.selectOption({
      searchText: team.searchText ?? team.value,
      optionLabel: team.optionLabel,
      expectedValue: team.value
    });
  }

  async selectOption(input: {
    searchText: string;
    optionLabel: string;
    expectedValue?: string;
  }): Promise<void> {
    const expectedValue = input.expectedValue ?? input.optionLabel.split(" · ")[0];
    await this.search(input.searchText);

    const option = this.option(input.optionLabel);
    await expect.poll(() => option.count()).toBeGreaterThan(0);
    await expect(option.first()).toBeVisible();

    try {
      await option.first().click({ timeout: 5000 });
    } catch {
      // The search text narrows the list to this single option, which is also
      // the default-highlighted entry, so Enter alone selects it.
      await this.input.press("Enter");
    }

    await expect(this.input).toHaveValue(expectedValue);
    await this.stabilizeAfterSelection();
  }

  async selectByKeyboard(searchText: string, expectedValue: string): Promise<void> {
    await this.input.click();
    await this.input.fill(searchText);
    await this.input.press("ArrowDown");
    await this.input.press("Enter");
    await expect(this.input).toHaveValue(expectedValue);
  }

  async stabilizeAfterSelection(): Promise<void> {
    await this.page.waitForTimeout(TEAM_SELECT_RESELECTION_STABILIZATION_MS);
  }
}
