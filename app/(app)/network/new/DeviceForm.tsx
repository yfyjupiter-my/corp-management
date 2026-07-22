"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { networkDeviceSchema, type NetworkDeviceInput } from "@/lib/validation/network";
import { DEVICE_TYPES, type DeviceType } from "@/lib/constants/enums";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/PageHead";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils/cn";

interface Site {
  id: string;
  name: string;
  country_code: string;
}

/**
 * Existing row for edit mode — the RLS-scoped Supabase select shape (nullable
 * columns) plus the id and last-read `updated_at` used for the BUS-6 guard.
 */
export interface DeviceEditValues {
  id: string;
  updated_at: string;
  site_id: string;
  device_type: DeviceType;
  brand: string | null;
  model: string | null;
  hostname: string | null;
  mgmt_ip: string | null;
  firmware: string | null;
  serial: string | null;
  install_date: string | null;
  warranty_end: string | null;
  credential_ref: string | null;
  notes: string | null;
}

/**
 * Client form (React Hook Form + Zod) for creating OR editing a network device.
 * Create → `POST /api/devices`; edit → `PATCH /api/devices/[id]` carrying the
 * last-read `updated_at` for BUS-6 optimistic concurrency (409 on a concurrent
 * change). The Zod schema shared with the server also runs the secrets guard.
 */
export function DeviceForm({
  sites,
  device,
  fixedType,
  eyebrow,
  title,
  subtitle,
  panelClassName,
}: {
  sites: Site[];
  device?: DeviceEditValues;
  /**
   * Pins `device_type` for a type-specific entry point (e.g. New Firewall). The
   * select renders read-only and the value is submitted from a hidden input.
   */
  fixedType?: DeviceType;
  /** Page heading is rendered here so Cancel/Save can sit on the title line. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  panelClassName?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(device);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NetworkDeviceInput>({
    resolver: zodResolver(networkDeviceSchema),
    defaultValues: device
      ? {
          site_id: device.site_id,
          device_type: fixedType ?? device.device_type ?? "router",
          brand: device.brand ?? undefined,
          model: device.model ?? undefined,
          hostname: device.hostname ?? undefined,
          mgmt_ip: device.mgmt_ip ?? undefined,
          firmware: device.firmware ?? undefined,
          serial: device.serial ?? undefined,
          install_date: device.install_date ?? undefined,
          warranty_end: device.warranty_end ?? undefined,
          credential_ref: device.credential_ref ?? undefined,
          notes: device.notes ?? undefined,
        }
      : { device_type: fixedType ?? "router" },
  });

  async function onSubmit(values: NetworkDeviceInput) {
    setServerError(null);
    const res = await fetch(isEdit ? `/api/devices/${device!.id}` : "/api/devices", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? { ...values, expected_updated_at: device!.updated_at } : values,
      ),
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
      {/* The heading lives inside the form so Cancel/Save sit on the title line
          and the submit button still submits without a `form=` reference. */}
      <PageHead
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {serverError && <span className="text-[12px] text-danger">{serverError}</span>}
            <Button type="button" variant="ghost" sm onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" sm disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Save"}
            </Button>
          </>
        }
      />

      <Panel className={panelClassName}>
        {/* pb-[1px] + each field's own pb-[17px] = the same 18px as the other sides. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-0 px-[18px] pt-[18px] pb-[1px]">
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
            {fixedType ? (
              // Pinned by the entry point: shown for context, submitted hidden so
              // the disabled control can't drop the value from the payload.
              <>
                <select className="fld capitalize opacity-70" value={fixedType} disabled onChange={() => {}}>
                  <option value={fixedType}>{fixedType}</option>
                </select>
                <input type="hidden" {...register("device_type")} />
              </>
            ) : (
              <select className="fld" {...register("device_type")}>
                {DEVICE_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            )}
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
            help="Password-manager link — never paste the secret."
          >
            <input className="fld" {...register("credential_ref")} placeholder="vault://it/kl-fw-01" />
          </Field>

          <Field label="Notes" error={errors.notes?.message} span2>
            <textarea className="fld min-h-[64px]" {...register("notes")} />
          </Field>
        </div>
      </Panel>

      <style>{`
        .fld { font-size:13px; color:var(--fg); background:var(--surface);
          border:1px solid var(--border-strong); border-radius:var(--radius-sm);
          padding:9px 11px; width:100%; transition:border .15s, box-shadow .15s; }
        .fld:focus { outline:none; border-color:var(--accent); box-shadow:var(--ring); }
      `}</style>
    </form>
  );
}

/**
 * One labelled control. The help/error line is absolutely positioned inside a
 * fixed `pb` strip so a field that has one is exactly as tall as a field that
 * doesn't — grid rows then stay equal height and the vertical rhythm between
 * every row (including the one above Notes) is the same 17px.
 */
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
  const message = error ?? help;
  return (
    <label className={"relative flex flex-col gap-1.5 pb-[17px]" + (span2 ? " md:col-span-2" : "")}>
      <span className="text-[12px] font-semibold text-fg-muted font-head">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {message && (
        <span
          title={message}
          className={cn(
            "absolute left-0 bottom-0 text-[11px] leading-[15px] truncate max-w-full",
            error ? "text-danger" : "text-fg-subtle",
          )}
        >
          {message}
        </span>
      )}
    </label>
  );
}
