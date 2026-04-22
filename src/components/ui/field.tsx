import { cn } from "@/lib/utils";

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

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--mint-deep)] focus:ring-2 focus:ring-[rgba(110,149,101,0.16)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-white/80 px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--mint-deep)] focus:ring-2 focus:ring-[rgba(110,149,101,0.16)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[16px] border border-[color:var(--line)] bg-white/80 px-3 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--mint-deep)] focus:ring-2 focus:ring-[rgba(110,149,101,0.16)]",
        className,
      )}
      {...props}
    />
  );
}
