interface StatusPillProps {
  label: string;
  tone?: "neutral" | "success" | "warning";
}

const toneClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-teal-200 bg-teal-50 text-teal-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900"
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{label}</span>;
}
