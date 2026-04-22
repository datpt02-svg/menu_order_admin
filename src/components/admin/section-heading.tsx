export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h3 className="font-[family:var(--font-coiny)] text-lg font-normal text-[var(--forest-dark)]">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
