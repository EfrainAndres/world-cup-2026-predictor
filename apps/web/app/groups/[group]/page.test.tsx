import { describe, expect, test } from "vitest";
import { generateStaticParams } from "./page";

describe("GroupDetailPage generateStaticParams", () => {
  test("generates params for all groups A–L", () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(12);
    expect(params.map((p) => p.group)).toEqual([
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"
    ]);
  });

  test("all params have a string group value", () => {
    const params = generateStaticParams();
    for (const p of params) {
      expect(typeof p.group).toBe("string");
    }
  });
});
