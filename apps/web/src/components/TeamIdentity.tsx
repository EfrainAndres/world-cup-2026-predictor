import React from "react";
import type { WorldCup2026TeamVisualIdentity } from "@world-cup-2026-predictor/api";
import { TeamFlag } from "./TeamFlag";

type TeamIdentitySize = "xs" | "sm" | "md" | "lg";
type TeamIdentityAlign = "start" | "center";

interface TeamIdentityProps {
  identity: WorldCup2026TeamVisualIdentity;
  size?: TeamIdentitySize;
  showFifaCode?: boolean;
  secondaryMetadata?: string;
  align?: TeamIdentityAlign;
  useShortName?: boolean;
  className?: string;
}

const sizeTextClasses: Record<TeamIdentitySize, { name: string; meta: string; gap: string }> = {
  xs: { name: "text-xs font-medium", meta: "text-[10px]", gap: "gap-1.5" },
  sm: { name: "text-sm font-medium", meta: "text-xs", gap: "gap-2" },
  md: { name: "text-sm font-semibold", meta: "text-xs", gap: "gap-2" },
  lg: { name: "text-base font-semibold", meta: "text-sm", gap: "gap-2.5" }
};

const alignClasses: Record<TeamIdentityAlign, string> = {
  start: "items-center justify-start",
  center: "items-center justify-center"
};

export function TeamIdentity({
  identity,
  size = "sm",
  showFifaCode = false,
  secondaryMetadata,
  align = "start",
  useShortName = false,
  className = ""
}: TeamIdentityProps) {
  const { name, meta, gap } = sizeTextClasses[size];
  const displayName = useShortName ? identity.shortName : identity.canonicalName;

  return (
    <span className={`inline-flex ${alignClasses[align]} ${gap} ${className}`}>
      <TeamFlag identity={identity} size={size} decorative />
      <span className="min-w-0">
        <span className={`block truncate text-slate-900 ${name}`} title={identity.canonicalName}>
          {displayName}
        </span>
        {(showFifaCode || secondaryMetadata !== undefined) ? (
          <span className={`block text-slate-500 ${meta}`}>
            {showFifaCode ? identity.fifaCode : null}
            {showFifaCode && secondaryMetadata !== undefined ? " · " : null}
            {secondaryMetadata}
          </span>
        ) : null}
      </span>
    </span>
  );
}
