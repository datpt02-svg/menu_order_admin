import { cn } from "@/lib/utils";

type FieldStateProps = {
  invalid?: boolean;
};

const invalidClassName = "border-[#c75b4a] focus:border-[#c75b4a] focus:ring-[rgba(199,91,74,0.18)]";

export function FieldLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("mb-2 block text-sm font-semibold text-[var(--forest-dark)]", className)}>
      {children}
    </label>
  );
}

export function FieldError({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return <p className={cn("mt-1 text-xs text-[#8a3527]", className)}>{children}</p>;
}

export function Input({ className, invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & FieldStateProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--mint-deep)] focus:ring-2 focus:ring-[rgba(110,149,101,0.16)]",
        invalid && invalidClassName,
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, invalid, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & FieldStateProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--mint-deep)] focus:ring-2 focus:ring-[rgba(110,149,101,0.16)]",
        invalid && invalidClassName,
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldStateProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-28 w-full rounded-[16px] border border-[color:var(--line)] bg-white/80 px-3 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--mint-deep)] focus:ring-2 focus:ring-[rgba(110,149,101,0.16)]",
        invalid && invalidClassName,
        className,
      )}
      {...props}
    />
  );
}

export type { FieldStateProps };
