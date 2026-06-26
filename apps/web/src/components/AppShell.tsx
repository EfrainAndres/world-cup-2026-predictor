import React from "react";
import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { MobileBottomNavigation } from "./MobileBottomNavigation";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip link — first focusable element; visible on keyboard focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-teal-700 focus:shadow-md focus:ring-2 focus:ring-teal-500 focus:outline-none"
      >
        Skip to main content
      </a>
      <AppHeader />
      {/* tabIndex={-1} enables programmatic focus from the skip link */}
      <main id="main-content" tabIndex={-1} className="pb-16 outline-none lg:pb-0">
        {children}
      </main>
      <MobileBottomNavigation />
    </div>
  );
}
