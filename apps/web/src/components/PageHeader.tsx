import React from "react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow !== undefined ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">{title}</h1>
        {description !== undefined ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
