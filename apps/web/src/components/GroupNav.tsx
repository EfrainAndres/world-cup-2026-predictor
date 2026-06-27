import React from "react";
import Link from "next/link";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

interface GroupNavProps {
  currentGroup?: string;
}

export function GroupNav({ currentGroup }: GroupNavProps) {
  return (
    <nav aria-label="Group navigation">
      <div className="-mx-4 overflow-x-auto sm:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-1.5 px-4 pb-1 sm:px-0">
          {GROUPS.map((g) => {
            const isCurrent = g === currentGroup?.toUpperCase();
            return (
              <Link
                key={g}
                href={`/groups/${g}`}
                aria-current={isCurrent ? "page" : undefined}
                className={[
                  "flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded border px-3 py-2 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
                  isCurrent
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
                ].join(" ")}
              >
                {g}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
