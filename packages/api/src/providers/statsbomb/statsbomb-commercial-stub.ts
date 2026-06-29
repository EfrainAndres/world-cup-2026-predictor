import type { TeamPerformanceDataProvider, TeamPerformanceProfileResult } from "./statsbomb-types.js";
import { buildFallbackProfile } from "./statsbomb-performance-profile.js";
import { teamNameToId } from "./statsbomb-team-mapping.js";

export function createStatsBombCommercialApiProvider(): TeamPerformanceDataProvider {
  return {
    providerId: "statsbomb_commercial_api",

    async getTeamPerformanceProfile(teamId: string, cutoffAt: string): Promise<TeamPerformanceProfileResult> {
      const tId = teamNameToId(teamId);
      const profile = buildFallbackProfile(teamId, tId, cutoffAt);
      return {
        teamId: tId,
        canonicalName: teamId,
        profile,
        issues: [
          {
            code: "no_data",
            message: "StatsBomb commercial API is not configured. This is a stub implementation.",
          },
        ],
      };
    },

    async listTeamPerformanceProfiles(_cutoffAt: string): Promise<TeamPerformanceProfileResult[]> {
      return [];
    },
  };
}
