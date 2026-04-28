import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = {
  primary:
    "bg-[var(--forest)] text-[var(--white)] shadow-[0_12px_24px_rgba(45,82,44,0.16)] hover:bg-[var(--forest-dark)] hover:shadow-[0_16px_28px_rgba(45,82,44,0.2)]",
  secondary:
    "bg-[var(--mint-strong)] text-[var(--forest-dark)] hover:bg-[#c3dfb8] hover:shadow-[0_14px_24px_rgba(45,82,44,0.14)]",
  ghost:
    "bg-transparent text-[var(--forest)] hover:bg-white/45 hover:shadow-[0_10px_18px_rgba(45,82,44,0.1)]",
  outline:
    "border border-[color:var(--line)] bg-white/70 text-[var(--forest-dark)] hover:bg-[var(--panel)] hover:shadow-[0_14px_24px_rgba(45,82,44,0.12)]",
  danger:
    "bg-[#9f4b3e] text-white hover:bg-[#853c30] hover:shadow-[0_16px_28px_rgba(159,75,62,0.22)]",
} as const;

const sizeVariants = {
  sm: "min-h-9 px-3 text-xs gap-1.5",
  md: "min-h-11 px-4 text-sm gap-2",
  lg: "min-h-14 px-6 text-base gap-2.5",
  icon: "h-9 w-9 p-0",
  "icon-sm": "h-8 w-8 p-0",
} as const;

type ButtonVariant = keyof typeof buttonVariants;
type ButtonSize = keyof typeof sizeVariants;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-pill)] font-semibold transition-all duration-200 enabled:cursor-pointer enabled:hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(110,149,101,0.28)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant],
        sizeVariants[size],
        className,
      )}
      {...props}
    />
  );
}
