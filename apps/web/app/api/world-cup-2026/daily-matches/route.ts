import { apiRuntime } from "@world-cup-2026-predictor/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const runtimeUrl = new URL("/world-cup-2026/daily-matches", "http://localhost");
  runtimeUrl.search = requestUrl.search;

  return apiRuntime.fetch(runtimeUrl, { method: "GET" });
}
