import React from "react";
import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow: string;
  titleId?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeader({ eyebrow, titleId, title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-teal-700">{eyebrow}</p>
        <h2 id={titleId} className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
          {title}
        </h2>
        {description !== undefined ? (
          <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>
      {action !== undefined ? (
        <div className="shrink-0">{action}</div>
      ) : null}
    </div>
  );
}
