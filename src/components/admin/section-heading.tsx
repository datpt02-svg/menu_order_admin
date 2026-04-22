export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="font-[family:var(--font-coiny)] text-lg font-normal text-[var(--forest-dark)]">{title}</h3>
      {description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
