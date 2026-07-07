import { cn } from "@/lib/utils/cn";

/** Data table primitives — DESIGN.md §5.5. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function Thead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr>
        {columns.map((c) => (
          <th
            key={c}
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
