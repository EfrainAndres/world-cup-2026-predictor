import React from "react";

type StatusBadgeVariant = "neutral" | "info" | "success" | "warning" | "danger" | "live";

interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  live: "border-red-300 bg-red-50 text-red-700"
};

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${variantClasses[variant]}`}>
      {variant === "live" ? (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
      ) : null}
      {label}
    </span>
  );
}
