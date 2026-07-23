import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CircuitForm } from "../../new/CircuitForm";
import type { IspCircuitInput } from "@/lib/validation/network";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Edit an ISP circuit (PRD Story 2). Both the circuit and the site list are
 * RLS-scoped — a circuit outside the caller's country returns not-found.
 */
export default async function EditCircuitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Reject a non-uuid before it reaches Postgres (mirrors the site/device edit
  // pages and PATCH /api/circuits/[id]) — an invalid cast is a 404 here.
  if (!z.string().uuid().safeParse(id).success) notFound();
  const t = await getDictionary();
  const supabase = await createClient();

  const [{ data: circuit }, { data: sites }] = await Promise.all([
    supabase
      .from("isp_circuits")
      .select(
        "id, site_id, provider, circuit_id, bandwidth, type, static_ips, contract_start, contract_end, monthly_cost, support_phone, notes, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("sites").select("id, name, country_code").is("archived_at", null).order("name"),
  ]);

  if (!circuit) notFound();

  // Map DB nulls to the form's optional fields. `updated_at` rides along for
  // BUS-6 optimistic concurrency — the form echoes it back on save.
  const initial: IspCircuitInput & { id: string; updated_at: string } = {
    id: circuit.id,
    updated_at: circuit.updated_at,
    site_id: circuit.site_id,
    provider: circuit.provider,
    circuit_id: circuit.circuit_id ?? undefined,
    bandwidth: circuit.bandwidth ?? undefined,
    type: circuit.type,
    static_ips: circuit.static_ips ?? undefined,
    contract_start: circuit.contract_start ?? undefined,
    contract_end: circuit.contract_end ?? undefined,
    // numeric(12,2) arrives as a string from PostgREST; the number input needs a
    // number, and the schema coerces it back on save.
    monthly_cost: circuit.monthly_cost ?? undefined,
    support_phone: circuit.support_phone ?? undefined,
    notes: circuit.notes ?? undefined,
  };

  // A circuit's identity is its provider, optionally narrowed by circuit id —
  // `circuit_id` is nullable, so provider alone is the fallback.
  const label = circuit.circuit_id
    ? `${circuit.provider} · ${circuit.circuit_id}`
    : circuit.provider;

  return (
    <CircuitForm
      sites={sites ?? []}
      circuit={initial}
      eyebrow={t.nav.network}
      title={t.forms.pages.editCircuitTitle(label)}
      subtitle={t.forms.pages.editCircuitSubtitle}
    />
  );
}
