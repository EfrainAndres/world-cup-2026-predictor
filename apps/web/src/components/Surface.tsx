import React from "react";
import type { ReactNode } from "react";

type SurfaceVariant = "default" | "muted" | "outlined" | "elevated";

interface SurfaceProps {
  children: ReactNode;
  variant?: SurfaceVariant;
  className?: string;
}

const variantClasses: Record<SurfaceVariant, string> = {
  default: "bg-white border border-slate-200",
  muted: "bg-slate-50 border border-slate-200",
  outlined: "border border-slate-300 bg-transparent",
  elevated: "bg-white border border-slate-200 shadow-md"
};

export function Surface({ children, variant = "default", className = "" }: SurfaceProps) {
  return (
    <div className={`rounded-lg ${variantClasses[variant]} ${className}`.trim()}>
      {children}
    </div>
  );
}
