import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "ghost" | "subtle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  sm?: boolean;
}

/** Button — DESIGN.md §5.2. primary = blue CTA, ghost = outlined, subtle = quiet. */
const base =
  "inline-flex items-center gap-[7px] font-head font-semibold rounded-sm cursor-pointer " +
  "border border-transparent transition-all duration-150 whitespace-nowrap " +
  "focus-visible:outline-none focus-visible:shadow-ring disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-[1.07]",
  ghost: "bg-surface text-fg border-border-strong hover:bg-surface-2",
  subtle: "bg-transparent text-fg-muted border-border hover:text-fg hover:bg-surface-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", sm = false, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        base,
        variants[variant],
        sm ? "px-[11px] py-[6px] text-xs" : "px-4 py-[9px] text-[13px]",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
