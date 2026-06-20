import React from "react";
import type { WorldCup2026GroupDetailQualificationSummary } from "../lib/api-client";

interface GroupDetailQualificationSummaryProps {
  qualification: WorldCup2026GroupDetailQualificationSummary;
}

function statusLabel(status: WorldCup2026GroupDetailQualificationSummary["status"]): string {
  switch (status) {
    case "official":
      return "Official";
    case "provisional":
      return "Provisional (live scores included)";
    case "foundation_only":
      return "Foundation only";
  }
}

function statusClasses(status: WorldCup2026GroupDetailQualificationSummary["status"]): string {
  switch (status) {
    case "official":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "provisional":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "foundation_only":
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function GroupDetailQualificationSummary({ qualification }: GroupDetailQualificationSummaryProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">Qualification summary</p>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(qualification.status)}`}>
          Qualification context: {statusLabel(qualification.status)}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">1st place</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-950">
            {qualification.firstPlace ?? "Undetermined"}
          </dd>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">2nd place</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-950">
            {qualification.secondPlace ?? "Undetermined"}
          </dd>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">3rd place</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-950">
            {qualification.thirdPlace ?? "Undetermined"}
          </dd>
          {qualification.thirdPlaceCurrentlyQualifying !== undefined && (
            <dd className="mt-0.5 text-xs text-slate-600">
              {qualification.thirdPlaceCurrentlyQualifying
                ? "Currently qualifies as best third"
                : "Does not currently qualify as best third"}
            </dd>
          )}
        </div>
      </dl>

      {qualification.status === "foundation_only" && (
        <p className="mt-3 text-xs text-slate-500">
          Qualification context is based on local static fallback data or an incomplete group. Official standings will update as matches are played.
        </p>
      )}
    </div>
  );
}
