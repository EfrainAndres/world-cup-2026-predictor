import {
  buildWorldCup2026DailyMatches,
  WORLD_CUP_2026_DISPLAY_TIMEZONE
} from "@world-cup-2026-predictor/api";
import { getDashboardLiveSyncResult } from "./server-runtime";

export async function buildDailyMatchesRouteResponse(
  request: Request,
  getSyncResult: typeof getDashboardLiveSyncResult = getDashboardLiveSyncResult
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const date = requestUrl.searchParams.get("date") ?? undefined;
  const timezone = requestUrl.searchParams.get("timezone") ?? WORLD_CUP_2026_DISPLAY_TIMEZONE;
  const syncResult = await getSyncResult();
  const result = buildWorldCup2026DailyMatches({
    ...(date === undefined ? {} : { date }),
    timezone,
    syncResult
  });

  return Response.json(result, {
    status: result.status === "validation_error" ? 400 : 200
  });
}
