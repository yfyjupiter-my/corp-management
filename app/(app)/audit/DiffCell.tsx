"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";

/**
 * Renders an audit diff (jsonb). The trigger stores changed-keys-only on UPDATE
 * and the full row on INSERT/DELETE, so we show the field names inline and let
 * the reviewer expand to the raw JSON. Read-only — the audit log is immutable.
 *
 * The toggle labels are read from the dictionary here rather than passed in:
 * they interpolate the field count, and a function cannot cross the RSC
 * boundary from the server page that renders this cell.
 */
export function DiffCell({ diff }: { diff: Record<string, unknown> | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  if (!diff || typeof diff !== "object") {
    return <span className="text-fg-subtle">—</span>;
  }

  const keys = Object.keys(diff);
  if (keys.length === 0) {
    return <span className="text-fg-subtle">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-left text-[12px] text-accent hover:underline font-head"
        aria-expanded={open}
      >
        {open ? t.audit.hideFields(keys.length) : t.audit.showFields(keys.length)}
      </button>
      {!open && (
        <span className="text-[11.5px] text-fg-subtle truncate max-w-[280px]">
          {keys.join(", ")}
        </span>
      )}
      {open && (
        <pre className="text-[11.5px] font-mono bg-surface-2 border border-border rounded-sm p-2 max-w-[360px] overflow-x-auto whitespace-pre-wrap break-words">
          {JSON.stringify(diff, null, 2)}
        </pre>
      )}
    </div>
  );
}
