"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ipSchemeSchema, type IpSchemeInput } from "@/lib/validation/network";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/i18n/validation";

/**
 * Add an IP scheme to a fixed site (PRD Story 2). The parent site isn't a form
 * field — it's passed in and registered as a hidden value so the RLS parent
 * scope can't be swapped from the client. Mutations go to a Route Handler.
 */
export function IpSchemeForm({ siteId }: { siteId: string }) {
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
  } = useForm<IpSchemeInput>({
    resolver: zodResolver(ipSchemeSchema),
    defaultValues: { site_id: siteId },
  });

  async function onSubmit(values: IpSchemeInput) {
    setServerError(null);
    const res = await fetch("/api/ip-schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? t.forms.saveFailed.ipScheme);
      return;
    }
    reset({ site_id: siteId });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("site_id")} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-[18px]">
        <Field label={t.forms.labels.subnetCidr} required error={vm(errors.subnet?.message)}>
          <input className="fld font-mono" {...register("subnet")} placeholder={t.forms.ph.subnet} />
        </Field>
        <Field label={t.forms.labels.gateway} error={vm(errors.gateway?.message)}>
          <input className="fld font-mono" {...register("gateway")} placeholder={t.forms.ph.gateway} />
        </Field>
        <Field label={t.forms.labels.dns} error={vm(errors.dns?.message)}>
          <input className="fld font-mono" {...register("dns")} placeholder={t.forms.ph.dns} />
        </Field>
        <Field label={t.forms.labels.dhcpRange} error={vm(errors.dhcp_range?.message)}>
          <input className="fld font-mono" {...register("dhcp_range")} placeholder={t.forms.ph.dhcpRange} />
        </Field>
        <Field label={t.forms.labels.notes} error={vm(errors.notes?.message)} span={4}>
          <input className="fld" {...register("notes")} placeholder={t.forms.ph.ipSchemeNotes} />
        </Field>
      </div>

      <div className="flex items-center gap-2.5 px-[18px] py-3 border-t border-border bg-surface-2">
        {serverError && <span className="text-[12px] text-danger mr-auto">{serverError}</span>}
        <Button type="submit" sm disabled={isSubmitting} className={serverError ? "" : "ml-auto"}>
          {isSubmitting ? t.common.saving : t.forms.actions.addIpScheme}
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
  span,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  span?: number;
  children: React.ReactNode;
}) {
  return (
    <label className={"flex flex-col gap-1.5" + (span === 4 ? " md:col-span-4" : "")}>
      <span className="text-[12px] font-semibold text-fg-muted font-head">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </label>
  );
}
