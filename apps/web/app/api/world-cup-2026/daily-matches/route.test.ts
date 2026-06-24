import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("daily matches API route", () => {
  test("defaults omitted timezone to Colombia display time", async () => {
    const response = await GET(new Request("http://localhost/api/world-cup-2026/daily-matches?date=2026-06-23"));
    const body = await response.json() as { status: string; timezone?: string };

    expect(body.status).toBe("success");
    expect(body.timezone).toBe("America/Bogota");
  });

  test("preserves explicit UTC timezone override", async () => {
    const response = await GET(new Request("http://localhost/api/world-cup-2026/daily-matches?date=2026-06-24&timezone=UTC"));
    const body = await response.json() as { status: string; timezone?: string };

    expect(body.status).toBe("success");
    expect(body.timezone).toBe("UTC");
  });
});
