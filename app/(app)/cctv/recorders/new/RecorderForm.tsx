"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { recorderSchema, type RecorderInput } from "@/lib/validation/cctv";
import { Button } from "@/components/ui/Button";

interface Site {
  id: string;
  name: string;
  country_code: string;
}

/**
 * Existing row for edit mode — the RLS-scoped Supabase select shape (nullable
 * columns) plus the id and last-read `updated_at` used for the BUS-6 guard.
 */
export interface RecorderEditValues {
  id: string;
  updated_at: string;
  site_id: string;
  brand: string | null;
  model: string | null;
  channels: number | null;
  storage_tb: number | null;
  retention_days: number | null;
  firmware: string | null;
  mgmt_ip: string | null;
  location: string | null;
  notes: string | null;
}

/**
 * Client form (React Hook Form + Zod) for creating OR editing a CCTV recorder.
 * Create → `POST /api/recorders`; edit → `PATCH /api/recorders/[id]` carrying the
 * last-read `updated_at` for BUS-6 optimistic concurrency (409 on a concurrent
 * change). The Zod schema shared with the server also runs the secrets guard.
 */
export function RecorderForm({ sites, recorder }: { sites: Site[]; recorder?: RecorderEditValues }) {
  const router = useRouter();
  const isEdit = Boolean(recorder);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecorderInput>({
    resolver: zodResolver(recorderSchema),
    defaultValues: recorder
      ? {
          site_id: recorder.site_id,
          brand: recorder.brand ?? undefined,
          model: recorder.model ?? undefined,
          channels: recorder.channels ?? undefined,
          storage_tb: recorder.storage_tb ?? undefined,
          retention_days: recorder.retention_days ?? undefined,
          firmware: recorder.firmware ?? undefined,
          mgmt_ip: recorder.mgmt_ip ?? undefined,
          location: recorder.location ?? undefined,
          notes: recorder.notes ?? undefined,
        }
      : undefined,
  });

  async function onSubmit(values: RecorderInput) {
    setServerError(null);
    const res = await fetch(isEdit ? `/api/recorders/${recorder!.id}` : "/api/recorders", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { ...values, expected_updated_at: recorder!.updated_at } : values,
      ),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Could not save recorder.");
      return;
    }
    router.push("/cctv");
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
        <Field label="Location" error={errors.location?.message}>
          <input className="fld" {...register("location")} placeholder="Server room" />
        </Field>

        <Field label="Brand" error={errors.brand?.message}>
          <input className="fld" {...register("brand")} placeholder="Hikvision" />
        </Field>
        <Field label="Model" error={errors.model?.message}>
          <input className="fld" {...register("model")} placeholder="DS-7616NI" />
        </Field>
        <Field label="Firmware" error={errors.firmware?.message}>
          <input className="fld" {...register("firmware")} placeholder="4.31.005" />
        </Field>

        <Field label="Channels" error={errors.channels?.message}>
          <input className="fld" type="number" min="1" step="1" {...register("channels")} placeholder="16" />
        </Field>
        <Field label="Storage (TB)" error={errors.storage_tb?.message}>
          <input className="fld" type="number" min="0" step="0.1" {...register("storage_tb")} placeholder="8" />
        </Field>
        <Field
          label="Retention (days)"
          error={errors.retention_days?.message}
          help="Flagged if below the country minimum."
        >
          <input className="fld" type="number" min="0" step="1" {...register("retention_days")} placeholder="30" />
        </Field>

        <Field label="Management IP" error={errors.mgmt_ip?.message}>
          <input className="fld font-mono" {...register("mgmt_ip")} placeholder="10.10.0.20" />
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
          {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Save recorder"}
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
