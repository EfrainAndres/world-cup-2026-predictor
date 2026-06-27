import { describe, expect, test } from "vitest";

import MatchesPage, { metadata as matchesMetadata } from "../../app/matches/page";
import GroupsPage, { metadata as groupsMetadata } from "../../app/groups/page";
import PredictionsPage, { metadata as predictionsMetadata } from "../../app/predictions/page";
import TournamentPage, { metadata as tournamentMetadata } from "../../app/tournament/page";
import ModelPage, { metadata as modelMetadata } from "../../app/model/page";

describe("upgraded route pages", () => {
  test("export page components for all route-owned Home migrations", () => {
    expect(typeof MatchesPage).toBe("function");
    expect(typeof GroupsPage).toBe("function");
    expect(typeof PredictionsPage).toBe("function");
    expect(typeof TournamentPage).toBe("function");
    expect(typeof ModelPage).toBe("function");
  });

  test("keep route metadata titles stable", () => {
    expect(matchesMetadata.title).toBe("Matches · World Cup 2026 Predictor");
    expect(groupsMetadata.title).toBe("Groups · World Cup 2026 Predictor");
    expect(predictionsMetadata.title).toBe("Predictions · World Cup 2026 Predictor");
    expect(tournamentMetadata.title).toBe("Tournament · World Cup 2026 Predictor");
    expect(modelMetadata.title).toBe("Model · World Cup 2026 Predictor");
  });
});
