import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "../../src/components/PageContainer";
import { PageHeader } from "../../src/components/PageHeader";
import { Surface } from "../../src/components/Surface";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

export const metadata: Metadata = {
  title: "Groups · World Cup 2026 Predictor"
};

export default function GroupsPage() {
  return (
    <PageContainer className="py-8">
      <PageHeader
        eyebrow="World Cup 2026"
        title="Groups"
        description="Explore all World Cup groups, standings, fixtures, and qualification status."
      />
      <div className="mt-8">
        <Surface>
          <div className="p-6">
            <p className="mb-4 text-sm font-semibold text-slate-700">Jump to a group</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {GROUPS.map((group) => (
                <li key={group}>
                  <Link
                    href={`/groups/${group}`}
                    className="block rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:border-teal-500 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    Group {group}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Full groups overview coming in Phase 12.19F — standings, qualification context, and group-stage summary.
            </p>
          </div>
        </Surface>
      </div>
    </PageContainer>
  );
}
