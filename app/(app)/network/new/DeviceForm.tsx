"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { networkDeviceSchema, type NetworkDeviceInput } from "@/lib/validation/network";
import { DEVICE_TYPES } from "@/lib/constants/enums";
import { Button } from "@/components/ui/Button";

interface Site {
  id: string;
  name: string;
  country_code: string;
}

/**
 * Client form (React Hook Form + Zod). Mutations go to a Route Handler so the
 * same endpoint can back a future read-only API and is easy to RLS-test.
 * The Zod schema shared with the server also runs the secrets guard on save.
 */
export function DeviceForm({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NetworkDeviceInput>({
    resolver: zodResolver(networkDeviceSchema),
    defaultValues: { device_type: "router" },
  });

  async function onSubmit(values: NetworkDeviceInput) {
    setServerError(null);
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Could not save device.");
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
        <Field label="Type" required error={errors.device_type?.message}>
          <select className="fld" {...register("device_type")}>
            {DEVICE_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Brand" error={errors.brand?.message}>
          <input className="fld" {...register("brand")} placeholder="Fortinet" />
        </Field>
        <Field label="Model" error={errors.model?.message}>
          <input className="fld" {...register("model")} placeholder="FortiGate 60F" />
        </Field>
        <Field label="Hostname" error={errors.hostname?.message}>
          <input className="fld font-mono" {...register("hostname")} placeholder="kl-fw-01" />
        </Field>

        <Field label="Management IP" error={errors.mgmt_ip?.message}>
          <input className="fld font-mono" {...register("mgmt_ip")} placeholder="10.10.0.1" />
        </Field>
        <Field label="Firmware" error={errors.firmware?.message}>
          <input className="fld" {...register("firmware")} placeholder="7.4.3" />
        </Field>
        <Field label="Serial" error={errors.serial?.message}>
          <input className="fld font-mono" {...register("serial")} placeholder="FG60F-…" />
        </Field>

        <Field label="Install date" error={errors.install_date?.message}>
          <input className="fld" type="date" {...register("install_date")} />
        </Field>
        <Field label="Warranty end" error={errors.warranty_end?.message}>
          <input className="fld" type="date" {...register("warranty_end")} />
        </Field>
        <Field
          label="Credential reference"
          error={errors.credential_ref?.message}
          help="Link to your password manager entry — never paste the actual secret."
        >
          <input className="fld" {...register("credential_ref")} placeholder="vault://it/kl-fw-01" />
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
          {isSubmitting ? "Saving…" : "Save device"}
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
