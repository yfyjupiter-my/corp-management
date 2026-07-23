"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { vlanSchema, type VlanInput } from "@/lib/validation/network";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/i18n/validation";

/**
 * Add a VLAN to a fixed site (PRD Story 2). Like the IP scheme form, the parent
 * site is a hidden value rather than a picker so RLS parent scope is fixed.
 * `vlan_id` is coerced + range-checked (1–4094) by the shared Zod schema.
 */
export function VlanForm({ siteId }: { siteId: string }) {
  const router = useRouter();
  const t = useT();
  const [serverError, setServerError] = useState<string | null>(null);
  // Zod messages are dictionary keys (13.29) - resolve them for display.
  const vm = (message?: string) => validationMessage(t, message);


  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VlanInput>({
    resolver: zodResolver(vlanSchema),
    defaultValues: { site_id: siteId },
  });

  async function onSubmit(values: VlanInput) {
    setServerError(null);
    const res = await fetch("/api/vlans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? t.forms.saveFailed.vlan);
      return;
    }
    reset({ site_id: siteId });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("site_id")} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-[18px]">
        <Field label={t.forms.labels.vlanId} required error={vm(errors.vlan_id?.message)}>
          <input
            className="fld font-mono"
            type="number"
            min={1}
            max={4094}
            {...register("vlan_id")}
            placeholder={t.forms.ph.vlanId}
          />
        </Field>
        <Field label={t.forms.labels.name} error={vm(errors.name?.message)}>
          <input className="fld" {...register("name")} placeholder={t.forms.ph.vlanName} />
        </Field>
        <Field label={t.forms.labels.subnet} error={vm(errors.subnet?.message)}>
          <input className="fld font-mono" {...register("subnet")} placeholder={t.forms.ph.vlanSubnet} />
        </Field>
        <Field label={t.forms.labels.purpose} error={vm(errors.purpose?.message)}>
          <input className="fld" {...register("purpose")} placeholder={t.forms.ph.vlanPurpose} />
        </Field>
      </div>

      <div className="flex items-center gap-2.5 px-[18px] py-3 border-t border-border bg-surface-2">
        {serverError && <span className="text-[12px] text-danger mr-auto">{serverError}</span>}
        <Button type="submit" sm disabled={isSubmitting} className={serverError ? "" : "ml-auto"}>
          {isSubmitting ? t.common.saving : t.forms.actions.addVlan}
        </Button>
      </div>

      <style>{`
        .fld { font-size:13px; color:var(--fg); background:var(--surface);
          border:1px solid var(--border-strong); border-radius:var(--radius-sm);
          padding:9px 11px; width:100%; transition:border .15s, box-shadow .15s; }
        .fld:focus { outline:none; border-color:var(--accent); box-shadow:var(--ring); }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-fg-muted font-head">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </label>
  );
}
