"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ispCircuitSchema, type IspCircuitInput } from "@/lib/validation/network";
import { CIRCUIT_TYPES } from "@/lib/constants/enums";
import { Button } from "@/components/ui/Button";

interface Site {
  id: string;
  name: string;
  country_code: string;
}

// `static_ips` is a text[] — collected here as free text and split on submit, so
// the resolver validates every other field and the server validates the array.
const formSchema = ispCircuitSchema.omit({ static_ips: true });
type CircuitFormInput = Omit<IspCircuitInput, "static_ips">;

/**
 * ISP circuit create form (React Hook Form + Zod). Mutations go to the
 * `/api/circuits` Route Handler; the shared Zod schema also runs the secrets
 * guard on save. RLS scopes which sites the caller may attach a circuit to.
 */
export function CircuitForm({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [staticIps, setStaticIps] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CircuitFormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: "fiber" },
  });

  async function onSubmit(values: CircuitFormInput) {
    setServerError(null);
    // Split on commas/whitespace/newlines; drop blanks. Server re-validates each.
    const ips = staticIps
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/circuits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, static_ips: ips.length ? ips : undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Could not save circuit.");
      return;
    }
    router.push("/network");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-[18px]">
        <Field label="Site" required error={errors.site_id?.message} span2>
          <select className="fld" {...register("site_id")}>
            <option value="">Select a site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.country_code} · {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type" required error={errors.type?.message}>
          <select className="fld" {...register("type")}>
            {CIRCUIT_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Provider" required error={errors.provider?.message}>
          <input className="fld" {...register("provider")} placeholder="TM Unifi" />
        </Field>
        <Field label="Circuit ID" error={errors.circuit_id?.message}>
          <input className="fld font-mono" {...register("circuit_id")} placeholder="TM-KL-004821" />
        </Field>
        <Field label="Bandwidth" error={errors.bandwidth?.message}>
          <input className="fld" {...register("bandwidth")} placeholder="1 Gbps" />
        </Field>

        <Field
          label="Static IPs"
          help="Comma or space separated — e.g. 203.0.113.10, 203.0.113.11"
          span2
        >
          <textarea
            className="fld font-mono min-h-[44px]"
            value={staticIps}
            onChange={(e) => setStaticIps(e.target.value)}
            placeholder="203.0.113.10, 203.0.113.11"
          />
        </Field>
        <Field label="Monthly cost" error={errors.monthly_cost?.message}>
          <input
            className="fld"
            type="number"
            step="0.01"
            min="0"
            {...register("monthly_cost")}
            placeholder="899.00"
          />
        </Field>

        <Field label="Contract start" error={errors.contract_start?.message}>
          <input className="fld" type="date" {...register("contract_start")} />
        </Field>
        <Field label="Contract end" error={errors.contract_end?.message}>
          <input className="fld" type="date" {...register("contract_end")} />
        </Field>
        <Field label="Support phone" error={errors.support_phone?.message}>
          <input className="fld" {...register("support_phone")} placeholder="100" />
        </Field>

        <Field label="Notes" error={errors.notes?.message} span2>
          <textarea className="fld min-h-[64px]" {...register("notes")} />
        </Field>
      </div>

      <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-t border-border bg-surface-2">
        <span className="text-[12px] text-fg-subtle mr-auto">
          Saving writes an entry to the audit log.
        </span>
        {serverError && <span className="text-[12px] text-danger">{serverError}</span>}
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save circuit"}
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
  help,
  span2,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={"flex flex-col gap-1.5" + (span2 ? " md:col-span-2" : "")}>
      <span className="text-[12px] font-semibold text-fg-muted font-head">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {help && <span className="text-[11px] text-fg-subtle">{help}</span>}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </label>
  );
}
