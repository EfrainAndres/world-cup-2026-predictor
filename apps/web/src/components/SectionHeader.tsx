interface SectionHeaderProps {
  eyebrow: string;
  titleId?: string;
  title: string;
  description: string;
}

export function SectionHeader({ eyebrow, titleId, title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase text-teal-700">{eyebrow}</p>
      <h2 id={titleId} className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}
