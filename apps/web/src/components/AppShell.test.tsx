import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    className,
    "aria-label": ariaLabel,
    "aria-current": ariaCurrent,
  }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
    "aria-label"?: string;
    "aria-current"?: string;
  }) {
    return React.createElement(
      "a",
      { href, className, "aria-label": ariaLabel, "aria-current": ariaCurrent },
      children
    );
  },
}));

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  test("renders a skip link targeting #main-content", () => {
    const html = renderToStaticMarkup(<AppShell><div>content</div></AppShell>);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain("Skip to main content");
  });

  test("skip link is the first element in the shell", () => {
    const html = renderToStaticMarkup(<AppShell><div>content</div></AppShell>);
    const skipLinkPos = html.indexOf('href="#main-content"');
    const headerPos = html.indexOf("<header");
    expect(skipLinkPos).toBeLessThan(headerPos);
  });

  test("renders a main landmark with id main-content", () => {
    const html = renderToStaticMarkup(<AppShell><div>content</div></AppShell>);
    expect(html).toContain('<main id="main-content"');
  });

  test("renders children inside the main landmark", () => {
    const html = renderToStaticMarkup(<AppShell><p data-testid="child">page content</p></AppShell>);
    const mainStart = html.indexOf('<main id="main-content"');
    const childPos = html.indexOf("page content");
    const mainEnd = html.lastIndexOf("</main>");
    expect(childPos).toBeGreaterThan(mainStart);
    expect(childPos).toBeLessThan(mainEnd);
  });

  test("renders a header landmark", () => {
    const html = renderToStaticMarkup(<AppShell><div /></AppShell>);
    expect(html).toContain("<header");
  });

  test("renders mobile navigation landmark", () => {
    const html = renderToStaticMarkup(<AppShell><div /></AppShell>);
    expect(html).toContain('aria-label="Mobile navigation"');
  });

  test("does not double-wrap with min-h-screen from page content", () => {
    // The shell itself provides min-h-screen; pages should not add it again
    const html = renderToStaticMarkup(<AppShell><div className="page-content">hello</div></AppShell>);
    expect(html).toContain("min-h-screen");
    // Only one instance of min-h-screen (from the shell)
    expect(html.match(/min-h-screen/g)?.length).toBe(1);
  });
});
