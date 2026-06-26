"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV_ITEMS, isRouteActive } from "../lib/navigation";

export function PrimaryNavigation() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Primary navigation" className="hidden lg:block">
      <ul className="flex items-center">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = isRouteActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
