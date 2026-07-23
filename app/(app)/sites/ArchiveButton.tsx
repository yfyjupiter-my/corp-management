"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

/**
 * Archive / restore a site (soft delete via `archived_at`). Archived sites are
 * hidden from lists by default but remain queryable — no hard deletes (PRD Story 1).
 */
export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/sites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !archived }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button sm variant="subtle" onClick={toggle} disabled={busy}>
      {busy ? "…" : archived ? t.common.restore : t.common.archive}
    </Button>
  );
}
