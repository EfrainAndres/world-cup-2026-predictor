import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { PRIMARY_NAV_ITEMS } from "../lib/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    className,
    "aria-current": ariaCurrent,
  }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
    "aria-current"?: string;
  }) {
    return React.createElement("a", { href, className, "aria-current": ariaCurrent }, children);
  },
}));

import { PrimaryNavigation } from "./PrimaryNavigation";

describe("PrimaryNavigation", () => {
  test("renders a nav element with accessible label", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    expect(html).toContain('aria-label="Primary navigation"');
  });

  test("renders all primary navigation labels", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(html).toContain(item.label);
    }
  });

  test("renders all primary navigation hrefs", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(html).toContain(`href="${item.href}"`);
    }
  });

  test("active route has aria-current=page — Home is active on /", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    expect(html).toContain('aria-current="page"');
  });

  test("exactly one item has aria-current=page when pathname is /", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    const matches = html.match(/aria-current="page"/g);
    expect(matches).toHaveLength(1);
  });

  test("active item receives teal styling", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    expect(html).toContain("bg-teal-50");
    expect(html).toContain("text-teal-700");
  });

  test("inactive items do not carry aria-current", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    // Only the Home link should be active (pathname = /)
    // All others should be absent of aria-current
    expect(html).not.toContain('aria-current="false"');
    expect(html).not.toContain("aria-current=\"undefined\"");
  });

  test("navigation is hidden on mobile via lg:block — contains lg:block class", () => {
    const html = renderToStaticMarkup(<PrimaryNavigation />);
    expect(html).toContain("lg:block");
  });
});
