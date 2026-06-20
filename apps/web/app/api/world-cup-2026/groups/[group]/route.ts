import { getWorldCup2026GroupDetail } from "@world-cup-2026-predictor/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ group: string }> }
): Promise<Response> {
  const { group } = await params;
  const result = await getWorldCup2026GroupDetail({ group: group.toUpperCase(), timezone: "UTC" });
  return Response.json(result);
}
