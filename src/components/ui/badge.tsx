import { cn } from "@/lib/utils";

const toneMap = {
  default: "bg-[rgba(63,111,66,0.12)] text-[var(--forest)]",
  success: "bg-[rgba(63,111,66,0.14)] text-[var(--forest-dark)]",
  warning: "bg-[rgba(185,140,42,0.16)] text-[#7a5b0f]",
  danger: "bg-[rgba(159,75,62,0.14)] text-[#8a3527]",
  info: "bg-[rgba(62,104,159,0.14)] text-[#244a77]",
} as const;

type Tone = keyof typeof toneMap;

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-[var(--radius-pill)] px-3 text-xs font-bold uppercase tracking-[0.08em]",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
