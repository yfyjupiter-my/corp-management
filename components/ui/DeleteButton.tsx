"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

/**
 * Row-level hard delete, used beside the Edit action on the Sites, Network and
 * CCTV tables. Calls `DELETE {endpoint}` and refreshes the list on success.
 *
 * `confirm` is the full sentence shown in the browser dialog and is supplied by
 * the caller — it must name the record AND any cascade, because a delete here is
 * not reversible (unlike a site's Archive toggle). It arrives as a plain string
 * so a server component can build it from the dictionary and pass it across the
 * RSC boundary.
 *
 * A failure is surfaced next to the button rather than swallowed: the server
 * message is already safe to render (`lib/api/db-error.ts` never leaks Postgres
 * internals) and is truncated with a `title` tooltip, matching the forms' error
 * strip.
 */
export function DeleteButton({
  endpoint,
  confirm,
}: {
  endpoint: string;
  confirm: string;
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? t.errors.deleteFailed);
    } catch {
      setError(t.errors.deleteFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <span
          role="alert"
          title={error}
          className="text-danger text-[11.5px] truncate max-w-[160px]"
        >
          {error}
        </span>
      )}
      <Button
        sm
        variant="subtle"
        onClick={onDelete}
        disabled={busy}
        className="text-danger hover:text-danger hover:bg-danger-bg"
      >
        {busy ? t.common.deleting : t.common.delete}
      </Button>
    </>
  );
}
