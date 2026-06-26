"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_BOTTOM_ITEMS, MOBILE_MORE_ITEMS, isRouteActive } from "../lib/navigation";

export function MobileBottomNavigation() {
  const pathname = usePathname() ?? "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Close the More menu on Escape and return focus to the trigger button.
  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  const moreActive = MOBILE_MORE_ITEMS.some((item) => isRouteActive(pathname, item.href));

  return (
    <div className="lg:hidden">
      {/* Background overlay — closes More menu on tap */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20"
          aria-hidden="true"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel — slides above the bottom bar */}
      {moreOpen && (
        <div
          id="mobile-more-menu"
          role="menu"
          aria-label="More destinations"
          className="fixed bottom-12 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg"
        >
          <ul className="divide-y divide-slate-100">
            {MOBILE_MORE_ITEMS.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    aria-current={active ? "page" : undefined}
                    className={`block px-6 py-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                      active ? "text-teal-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Fixed bottom navigation bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-[100dvw] border-t border-slate-200 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex w-full min-w-0">
          {MOBILE_BOTTOM_ITEMS.map((item) => {
            const active = isRouteActive(pathname, item.href);
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                    active ? "text-teal-700" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              ref={moreButtonRef}
              type="button"
              aria-expanded={moreOpen}
              aria-controls="mobile-more-menu"
              onClick={() => setMoreOpen((prev) => !prev)}
              className={`flex w-full flex-col items-center py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                moreActive || moreOpen ? "text-teal-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
