"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { maintenanceLogSchema } from "@/lib/validation/cctv";
import type { MaintenanceTarget } from "@/lib/constants/enums";
import { Button } from "@/components/ui/Button";

export interface TargetOption {
  /** Encodes `${target_table}:${target_id}` so one <select> spans all target types. */
  value: string;
  label: string;
  group: string;
}

// Form-only shape: the two polymorphic columns are collected as one encoded
// `target` field and split back apart on submit; every other field is validated
// by the shared schema (which the server re-validates).
const formSchema = maintenanceLogSchema
  .omit({ target_table: true, target_id: true })
  .extend({ target: z.string().min(1, "Select an asset") });
type MaintenanceFormInput = z.infer<typeof formSchema>;

/**
 * Log a maintenance event (PRD Story 3, TASKS 5.4). Polymorphic on
 * `target_table`/`target_id` — one combined <select> spans devices, recorders,
 * and cameras; the encoded value is split back into the two schema fields on
 * submit. Writes to `POST /api/maintenance-logs`; RLS scopes visible targets.
 */
export function MaintenanceLogForm({
  targets,
  preset,
}: {
  targets: TargetOption[];
  preset?: { target_table: MaintenanceTarget; target_id: string };
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceFormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: preset ? { target: `${preset.target_table}:${preset.target_id}` } : undefined,
  });

  async function onSubmit(values: MaintenanceFormInput) {
    setServerError(null);
    const sep = values.target.indexOf(":");
    const target_table = values.target.slice(0, sep);
    const target_id = values.target.slice(sep + 1);

    const res = await fetch("/api/maintenance-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_table,
        target_id,
        date: values.date,
        action: values.action,
        performed_by: values.performed_by,
        next_due: values.next_due,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Could not log maintenance.");
      return;
    }
    router.push("/cctv");
    router.refresh();
  }

  const groups = Array.from(new Set(targets.map((t) => t.group)));

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-[18px]">
        <Field label="Asset" required error={errors.target?.message} span2>
          <select className="fld" {...register("target")} disabled={Boolean(preset)}>
            <option value="">Select an asset…</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {targets
                  .filter((t) => t.group === g)
                  .map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Date" required error={errors.date?.message}>
          <input className="fld" type="date" {...register("date")} />
        </Field>

        <Field label="Action" required error={errors.action?.message} span2>
          <input className="fld" {...register("action")} placeholder="Cleaned lens, replaced PSU" />
        </Field>
        <Field label="Next due" error={errors.next_due?.message}>
          <input className="fld" type="date" {...register("next_due")} />
        </Field>

        <Field label="Performed by" error={errors.performed_by?.message}>
          <input className="fld" {...register("performed_by")} placeholder="Vendor / technician" />
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
          {isSubmitting ? "Saving…" : "Log maintenance"}
        </Button>
      </div>

      <style>{`
        .fld { font-size:13px; color:var(--fg); background:var(--surface);
          border:1px solid var(--border-strong); border-radius:var(--radius-sm);
          padding:9px 11px; width:100%; transition:border .15s, box-shadow .15s; }
        .fld:focus { outline:none; border-color:var(--accent); box-shadow:var(--ring); }
        .fld:disabled { opacity:.6; }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  span2,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={"flex flex-col gap-1.5" + (span2 ? " md:col-span-2" : "")}>
      <span className="text-[12px] font-semibold text-fg-muted font-head">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </label>
  );
}
