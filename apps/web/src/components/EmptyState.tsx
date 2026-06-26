import React from "react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description !== undefined ? (
        <p className="max-w-xs text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
      {action !== undefined ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
