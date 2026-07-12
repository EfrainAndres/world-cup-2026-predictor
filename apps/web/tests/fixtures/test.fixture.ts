import { test as base } from "@playwright/test";
import { ChampionOutlook } from "../components/champion-outlook.component";
import { KnockoutBracket } from "../components/knockout-bracket.component";
import { SearchableTeamSelect } from "../components/searchable-team-select.component";
import { TournamentRoundNav } from "../components/tournament-round-nav.component";
import { PredictionFlow } from "../flows/prediction.flow";
import { TournamentFlow } from "../flows/tournament.flow";
import { PredictionsPage } from "../pages/predictions.page";
import { TournamentPage } from "../pages/tournament.page";

type WorldCupFixtures = {
  predictionsPage: PredictionsPage;
  homeTeamSelect: SearchableTeamSelect;
  awayTeamSelect: SearchableTeamSelect;
  predictionFlow: PredictionFlow;
  tournamentPage: TournamentPage;
  knockoutBracket: KnockoutBracket;
  tournamentRoundNav: TournamentRoundNav;
  championOutlook: ChampionOutlook;
  tournamentFlow: TournamentFlow;
};

export const test = base.extend<WorldCupFixtures>({
  predictionsPage: async ({ page }, use) => {
    await use(new PredictionsPage(page));
  },
  homeTeamSelect: async ({ page }, use) => {
    await use(new SearchableTeamSelect(page, "Home team"));
  },
  awayTeamSelect: async ({ page }, use) => {
    await use(new SearchableTeamSelect(page, "Away team"));
  },
  predictionFlow: async ({ predictionsPage, homeTeamSelect, awayTeamSelect }, use) => {
    await use(new PredictionFlow(predictionsPage, homeTeamSelect, awayTeamSelect));
  },
  tournamentPage: async ({ page }, use) => {
    await use(new TournamentPage(page));
  },
  knockoutBracket: async ({ page }, use) => {
    await use(new KnockoutBracket(page));
  },
  tournamentRoundNav: async ({ page }, use) => {
    await use(new TournamentRoundNav(page));
  },
  championOutlook: async ({ page }, use) => {
    await use(new ChampionOutlook(page));
  },
  tournamentFlow: async ({ tournamentPage, tournamentRoundNav }, use) => {
    await use(new TournamentFlow(tournamentPage, tournamentRoundNav));
  }
});

export { expect } from "@playwright/test";
