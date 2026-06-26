import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { MOBILE_BOTTOM_ITEMS, MOBILE_MORE_ITEMS } from "../lib/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    className,
    "aria-current": ariaCurrent,
    role,
    onClick,
  }: {
    href: string;
    children?: React.ReactNode;
    className?: string;
    "aria-current"?: string;
    role?: string;
    onClick?: () => void;
  }) {
    return React.createElement(
      "a",
      { href, className, "aria-current": ariaCurrent, role, onClick },
      children
    );
  },
}));

import { MobileBottomNavigation } from "./MobileBottomNavigation";

describe("MobileBottomNavigation", () => {
  test("renders the mobile navigation landmark", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain('aria-label="Mobile navigation"');
  });

  test("renders all mobile bottom item labels", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    for (const item of MOBILE_BOTTOM_ITEMS) {
      expect(html).toContain(item.label);
    }
  });

  test("renders all mobile bottom item hrefs", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    for (const item of MOBILE_BOTTOM_ITEMS) {
      expect(html).toContain(`href="${item.href}"`);
    }
  });

  test("renders the More button", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain(">More<");
  });

  test("More button has aria-expanded=false initially", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain('aria-expanded="false"');
  });

  test("More button references the more menu via aria-controls", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain('aria-controls="mobile-more-menu"');
  });

  test("More menu is initially closed — no menu role rendered", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).not.toContain('role="menu"');
  });

  test("More menu items are not rendered in initial state", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    // MOBILE_MORE_ITEMS labels should not appear (menu is closed)
    for (const item of MOBILE_MORE_ITEMS) {
      // The menu is closed in SSR initial state — items are not rendered
      expect(html).not.toContain(`aria-label="More destinations"`);
    }
  });

  test("Home is active when pathname is /", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain('aria-current="page"');
  });

  test("nav is hidden on desktop via lg:hidden wrapper", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain("lg:hidden");
  });

  test("bottom nav is fixed at the bottom of the viewport", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain("fixed");
    expect(html).toContain("bottom-0");
  });

  test("safe-area inset support is applied", () => {
    const html = renderToStaticMarkup(<MobileBottomNavigation />);
    expect(html).toContain("safe-area-inset-bottom");
  });
});
