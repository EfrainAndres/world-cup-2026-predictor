import {
  buildWorldCup2026DailyMatches,
  WORLD_CUP_2026_DISPLAY_TIMEZONE
} from "@world-cup-2026-predictor/api";
import { getDashboardLiveSyncResult } from "../../../../src/lib/server-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const date = requestUrl.searchParams.get("date") ?? undefined;
  const timezone = requestUrl.searchParams.get("timezone") ?? WORLD_CUP_2026_DISPLAY_TIMEZONE;
  const syncResult = await getDashboardLiveSyncResult();
  const result = buildWorldCup2026DailyMatches({
    ...(date === undefined ? {} : { date }),
    timezone,
    syncResult
  });

  return Response.json(result, {
    status: result.status === "validation_error" ? 400 : 200
  });
}
