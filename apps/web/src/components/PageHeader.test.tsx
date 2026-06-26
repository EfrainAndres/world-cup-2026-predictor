import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  test("renders title in an h1", () => {
    const html = renderToStaticMarkup(<PageHeader title="Match Results" />);
    expect(html).toContain("<h1");
    expect(html).toContain("Match Results");
  });

  test("renders eyebrow when provided", () => {
    const html = renderToStaticMarkup(<PageHeader title="Groups" eyebrow="Group Stage" />);
    expect(html).toContain("Group Stage");
  });

  test("does not render eyebrow markup when not provided", () => {
    const html = renderToStaticMarkup(<PageHeader title="Groups" />);
    expect(html).not.toContain("uppercase tracking-wide");
  });

  test("renders description when provided", () => {
    const html = renderToStaticMarkup(<PageHeader title="Groups" description="All group standings" />);
    expect(html).toContain("All group standings");
  });

  test("does not render description markup when not provided", () => {
    const html = renderToStaticMarkup(<PageHeader title="Groups" />);
    expect(html).not.toContain("leading-6 text-slate-600");
  });

  test("renders actions slot when provided", () => {
    const html = renderToStaticMarkup(
      <PageHeader title="Groups" actions={<button type="button">Export</button>} />
    );
    expect(html).toContain("Export");
  });

  test("h1 renders without nested interactive elements by default", () => {
    const html = renderToStaticMarkup(<PageHeader title="Groups" />);
    expect(html).not.toContain("<button");
  });
});
