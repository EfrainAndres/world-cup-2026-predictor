"use client";
import React, { useState } from "react";
import type { WorldCup2026TeamVisualIdentity } from "@world-cup-2026-predictor/api";

type TeamFlagSize = "xs" | "sm" | "md" | "lg";

interface TeamFlagProps {
  identity: WorldCup2026TeamVisualIdentity;
  size?: TeamFlagSize;
  decorative?: boolean;
}

const sizeClasses: Record<TeamFlagSize, { wrapper: string; text: string; img: string }> = {
  xs: { wrapper: "h-4 w-6", text: "text-[8px]", img: "h-4 w-6" },
  sm: { wrapper: "h-5 w-8", text: "text-[9px]", img: "h-5 w-8" },
  md: { wrapper: "h-6 w-9", text: "text-[10px]", img: "h-6 w-9" },
  lg: { wrapper: "h-8 w-12", text: "text-xs", img: "h-8 w-12" }
};

// Flags with predominantly white backgrounds need a subtle border to remain visible
// on white page surfaces. Update this set if additional near-white flags are added.
const WHITE_FLAG_CODES = new Set(["SUI", "JPN"]);

export function TeamFlag({ identity, size = "sm", decorative = false }: TeamFlagProps) {
  const [imgError, setImgError] = useState(false);
  const { wrapper, text } = sizeClasses[size];
  const alt = decorative ? "" : identity.flagAlt;
  const needsBorder = WHITE_FLAG_CODES.has(identity.fifaCode) || identity.flagPath === null;
  const borderClass = needsBorder ? "ring-1 ring-slate-200 ring-inset" : "";

  if (identity.flagPath !== null && !imgError) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-sm ${borderClass} ${wrapper}`}
        aria-hidden={decorative ? true : undefined}
      >
        <img
          src={identity.flagPath}
          alt={alt}
          width={48}
          height={32}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  // FIFA-code fallback — shown when flagPath is null or the image fails to load.
  // No broken-image browser icon is displayed because the <img> is never rendered
  // in this branch.
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-slate-100 ring-1 ring-slate-200 ring-inset ${wrapper}`}
      aria-hidden={decorative ? true : undefined}
      title={decorative ? undefined : identity.flagAlt}
    >
      <span className={`font-mono font-semibold text-slate-500 select-none ${text}`} aria-hidden="true">
        {identity.fifaCode}
      </span>
    </span>
  );
}
