import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = {
  primary:
    "bg-[var(--forest)] text-[var(--white)] shadow-[0_12px_24px_rgba(45,82,44,0.16)] hover:bg-[var(--forest-dark)]",
  secondary:
    "bg-[var(--mint-strong)] text-[var(--forest-dark)] hover:bg-[#c3dfb8]",
  ghost:
    "bg-transparent text-[var(--forest)] hover:bg-white/45",
  outline:
    "border border-[color:var(--line)] bg-white/70 text-[var(--forest-dark)] hover:bg-[var(--panel)]",
  danger:
    "bg-[#9f4b3e] text-white hover:bg-[#853c30]",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-pill)] px-4 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
