import { cn } from "@/lib/utils/cn";

/** Panel + header — DESIGN.md §5.5. Wraps tables and content sections. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded shadow-sm overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  actions,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-[14px] border-b border-border">
      <h4 className="text-sm font-semibold font-head">{title}</h4>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Empty-state row for a panel with no data yet. */
export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center text-[13px] text-fg-subtle">{children}</div>
  );
}
