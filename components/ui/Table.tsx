import { cn } from "@/lib/utils/cn";

/** Data table primitives — DESIGN.md §5.5. */
export function Table({
  children,
  fixed = false,
}: {
  children: React.ReactNode;
  /**
   * Opt into `table-fixed`. Auto layout sizes columns to each table's own
   * content, so two tables stacked in sibling panels (e.g. one country group
   * per panel on /sites) never line up. Pair with `Thead widths`.
   */
  fixed?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse", fixed && "table-fixed")}>
        {children}
      </table>
    </div>
  );
}

export function Thead({
  columns,
  widths,
}: {
  columns: string[];
  /** Per-column CSS widths, index-aligned with `columns`. Needs `Table fixed`. */
  widths?: string[];
}) {
  return (
    <thead>
      <tr>
        {columns.map((c, i) => (
          <th
            key={c}
            style={widths?.[i] ? { width: widths[i] } : undefined}
            className="text-left font-head text-[11px] font-bold tracking-[0.05em] uppercase text-fg-subtle px-4 py-[11px] bg-surface-2 border-b border-border"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function Td({
  children,
  className,
  mono = false,
}: {
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 border-b border-border text-[13px] text-fg [tr:last-child_&]:border-b-0",
        mono && "font-mono text-[12.5px] font-medium tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-surface-2">{children}</tr>;
}
