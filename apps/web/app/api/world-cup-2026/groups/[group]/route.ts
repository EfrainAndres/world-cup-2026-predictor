import {
  getWorldCup2026GroupDetail,
  WORLD_CUP_2026_DISPLAY_TIMEZONE
} from "@world-cup-2026-predictor/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ group: string }> }
): Promise<Response> {
  const { group } = await params;
  const result = await getWorldCup2026GroupDetail({
    group: group.toUpperCase(),
    timezone: WORLD_CUP_2026_DISPLAY_TIMEZONE
  });
  return Response.json(result);
}
