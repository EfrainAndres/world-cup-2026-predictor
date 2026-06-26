import React from "react";
import type { ReactNode } from "react";

interface TechnicalDisclosureProps {
  summary: string;
  children: ReactNode;
  className?: string;
}

export function TechnicalDisclosure({ summary, children, className = "" }: TechnicalDisclosureProps) {
  return (
    <details className={`group rounded-md border border-slate-200 bg-slate-50 ${className}`.trim()}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 [&::-webkit-details-marker]:hidden">
        <span
          className="inline-block h-3 w-3 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          ▶
        </span>
        {summary}
      </summary>
      <div className="border-t border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-600">
        {children}
      </div>
    </details>
  );
}
