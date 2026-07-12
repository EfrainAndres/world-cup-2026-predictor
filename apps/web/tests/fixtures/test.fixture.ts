import { test as base } from "@playwright/test";
import { SearchableTeamSelect } from "../components/searchable-team-select.component";
import { PredictionFlow } from "../flows/prediction.flow";
import { PredictionsPage } from "../pages/predictions.page";

type PredictionFixtures = {
  predictionsPage: PredictionsPage;
  homeTeamSelect: SearchableTeamSelect;
  awayTeamSelect: SearchableTeamSelect;
  predictionFlow: PredictionFlow;
};

export const test = base.extend<PredictionFixtures>({
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
  }
});

export { expect } from "@playwright/test";
