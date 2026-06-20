import React from "react";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

interface GroupNavProps {
  currentGroup: string;
}

export function GroupNav({ currentGroup }: GroupNavProps) {
  return (
    <nav aria-label="World Cup 2026 group navigation">
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map((g) => {
          const isCurrent = g === currentGroup;
          return (
            <a
              key={g}
              href={`/groups/${g}`}
              aria-current={isCurrent ? "page" : undefined}
              className={
                isCurrent
                  ? "rounded px-2.5 py-1 text-sm font-semibold bg-teal-700 text-white"
                  : "rounded px-2.5 py-1 text-sm font-medium text-teal-700 hover:bg-teal-50 border border-teal-200"
              }
            >
              {g}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
