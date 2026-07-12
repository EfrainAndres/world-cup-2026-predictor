import { expect, type Locator, type Page } from "@playwright/test";
import { tournamentRounds, type TournamentRoundKey } from "../data/tournament-test-data";

export class TournamentPage {
  readonly championOutlookRegion: Locator;
  readonly knockoutBracketRegion: Locator;
  readonly primaryNavigation: Locator;
  readonly roundNavigation: Locator;
  readonly technicalDisclosure: Locator;
  readonly titleHeading: Locator;

  constructor(readonly page: Page) {
    this.championOutlookRegion = page.getByRole("region", {
      name: "Champion outlook",
      exact: true
    });
    this.knockoutBracketRegion = page.getByRole("region", {
      name: "Knockout bracket",
      exact: true
    });
    this.primaryNavigation = page.getByRole("navigation", {
      name: "Primary navigation"
    });
    this.roundNavigation = page.getByRole("navigation", {
      name: "Tournament round navigation"
    });
    this.technicalDisclosure = page.locator("details").filter({
      hasText: "Technical/provenance disclosure"
    });
    this.titleHeading = page.getByRole("heading", {
      name: "Tournament",
      exact: true
    });
  }

  async goto(): Promise<void> {
    await this.page.goto("/tournament");
  }

  getRoundSection(round: TournamentRoundKey): Locator {
    return this.page.locator(`section#${tournamentRounds[round].sectionId}`);
  }

  getMatchCard(matchNumber: number): Locator {
    return this.page.locator(`[data-knockout-fixture="${matchNumber}"]`);
  }

  async openTechnicalDisclosure(): Promise<void> {
    await this.technicalDisclosure.locator("summary").click();
  }

  async expectNoHorizontalOverflow(): Promise<void> {
    const { clientWidth, scrollWidth } = await this.page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  }
}
