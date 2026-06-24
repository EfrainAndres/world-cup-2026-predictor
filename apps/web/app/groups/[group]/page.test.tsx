import { describe, expect, test } from "vitest";
import { dynamic, runtime } from "./page";

describe("GroupDetailPage route configuration", () => {
  test("uses dynamic Node rendering so live provider data is not frozen at build time", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(runtime).toBe("nodejs");
  });
});
