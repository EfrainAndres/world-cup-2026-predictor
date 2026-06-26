import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  test("renders title", () => {
    const html = renderToStaticMarkup(<EmptyState title="No matches today" />);
    expect(html).toContain("No matches today");
  });

  test("renders description when provided", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No matches" description="Check back tomorrow" />
    );
    expect(html).toContain("Check back tomorrow");
  });

  test("does not render description markup when not provided", () => {
    const html = renderToStaticMarkup(<EmptyState title="No matches" />);
    expect(html).not.toContain("max-w-xs text-xs");
  });

  test("renders action slot when provided", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No matches" action={<a href="/matches">View all</a>} />
    );
    expect(html).toContain("View all");
  });

  test("uses a centered flex layout", () => {
    const html = renderToStaticMarkup(<EmptyState title="Empty" />);
    expect(html).toContain("flex-col");
    expect(html).toContain("items-center");
  });
});
