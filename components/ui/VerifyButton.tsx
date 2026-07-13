"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * "Verify — still accurate" action (PRD Story 2 / finalize.md — Common columns).
 * Stamps `last_verified_at = now()` on one row via the RLS-scoped verify route.
 * The `table` is validated against an allow-list server-side.
 */
export function VerifyButton({ table, id }: { table: string; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button sm variant="ghost" onClick={verify} disabled={busy}>
      {busy ? "Verifying…" : "Verify — still accurate"}
    </Button>
  );
}
