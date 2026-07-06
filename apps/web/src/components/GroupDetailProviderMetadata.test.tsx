import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { GroupDetailProviderMetadata } from "./GroupDetailProviderMetadata";

describe("GroupDetailProviderMetadata", () => {
  test("renders concise provider notice and grouped warning summary", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProviderMetadata
        metadata={{
          configuredProvider: "football_data_org",
          activeProvider: "football-data.org",
          cacheUsed: false,
          localFallbackUsed: false,
          stale: false,
          lastSuccessfulSync: "2026-06-19T11:00:00Z"
        }}
        warnings={[
          "Fixture '537417' is missing a provider group label.",
          "Fixture '537423' is missing a provider group label.",
          "Fixture '537417' could not be resolved to a canonical World Cup 2026 group-stage fixture.",
          "Provider standings include ungrouped rows and were not used as grouped standings truth."
        ]}
      />
    );

    expect(html).toContain("Provider data notice");
    expect(html).toContain("2 provider fixtures are missing group labels.");
    expect(html).toContain("1 provider fixture could not be mapped to canonical WC2026 fixtures.");
    expect(html).toContain("Grouped standings were derived from validated match records.");
    expect(html).toContain("View raw technical warnings");
    expect(html).toContain("537417");
  });

  test("keeps raw-warning disclosure collapsed by default", () => {
    const html = renderToStaticMarkup(
      <GroupDetailProviderMetadata
        metadata={{
          configuredProvider: "football_data_org",
          activeProvider: "football-data.org",
          cacheUsed: true,
          localFallbackUsed: false,
          stale: true
        }}
        warnings={["Fixture '537417' is missing a provider group label."]}
      />
    );

    expect(html).toContain("<details");
    expect(html).not.toContain(" open");
  });
});
