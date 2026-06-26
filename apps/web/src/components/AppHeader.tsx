import React from "react";
import Link from "next/link";
import { PrimaryNavigation } from "./PrimaryNavigation";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="World Cup 2026 Predictor — Home"
          className="shrink-0 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <span className="text-sm font-semibold text-teal-700">WC2026</span>
          <span className="ml-1.5 hidden text-sm text-slate-500 sm:inline">Predictor</span>
        </Link>
        <PrimaryNavigation />
        <Link
          href="/prediction-history"
          className="hidden shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 lg:block"
        >
          History
        </Link>
      </div>
    </header>
  );
}
