import { cn } from "@/lib/utils/cn";

type Accent = "accent" | "warn" | "danger";

/** KPI card — DESIGN.md §5.3. Left accent bar, big tabular number. */
export function Kpi({
  label,
  value,
  unit,
  delta,
  accent = "accent",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: React.ReactNode;
  accent?: Accent;
  icon?: React.ReactNode;
}) {
  const bar =
    accent === "warn" ? "before:bg-warn" : accent === "danger" ? "before:bg-danger" : "before:bg-accent";
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface border border-border rounded p-4 shadow-sm",
        "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
        bar,
      )}
    >
      <div className="flex items-center gap-[7px] text-xs text-fg-muted">
        {icon}
        {label}
      </div>
      <div className="font-head text-[30px] font-bold mt-1.5 tracking-[-0.02em] tabular-nums">
        {value}
        {unit && <small className="text-[15px] text-fg-subtle font-medium"> {unit}</small>}
      </div>
      {delta && <div className="text-[11.5px] mt-1.5 text-fg-subtle flex items-center gap-[5px]">{delta}</div>}
    </div>
  );
}
