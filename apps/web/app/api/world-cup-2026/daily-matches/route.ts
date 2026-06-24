import { apiRuntime, WORLD_CUP_2026_DISPLAY_TIMEZONE } from "@world-cup-2026-predictor/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const runtimeUrl = new URL("/world-cup-2026/daily-matches", "http://localhost");
  runtimeUrl.search = requestUrl.search;
  if (!runtimeUrl.searchParams.has("timezone")) {
    runtimeUrl.searchParams.set("timezone", WORLD_CUP_2026_DISPLAY_TIMEZONE);
  }

  return apiRuntime.fetch(runtimeUrl, { method: "GET" });
}
