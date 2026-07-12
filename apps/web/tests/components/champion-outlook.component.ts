import { type Locator, type Page } from "@playwright/test";

export type PodiumLabel = "Champion" | "Runner-up" | "Third place" | "Fourth place";

export class ChampionOutlook {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("region", {
      name: "Champion outlook",
      exact: true
    });
  }

  podiumLabel(label: PodiumLabel): Locator {
    return this.root.getByText(label, { exact: true });
  }

  resolutionBadge(label: "Projected" | "Official"): Locator {
    return this.root.getByText(label, { exact: true });
  }
}
