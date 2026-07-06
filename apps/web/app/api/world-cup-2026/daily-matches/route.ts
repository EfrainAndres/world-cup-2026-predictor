import { buildDailyMatchesRouteResponse } from "../../../../src/lib/daily-matches-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return buildDailyMatchesRouteResponse(request);
}
