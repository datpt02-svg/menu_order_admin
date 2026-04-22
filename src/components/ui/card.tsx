import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-[color:var(--line)] bg-[var(--card)] shadow-[var(--shadow-soft)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
