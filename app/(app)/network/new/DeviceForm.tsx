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
import { useT } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/i18n/validation";

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
  const t = useT();
  const isEdit = Boolean(device);
  // Zod messages are dictionary keys (13.29) — resolve them for display.
  const vm = (message?: string) => validationMessage(t, message);
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
      setServerError(body.error ?? t.forms.saveFailed.device);
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
              {t.common.cancel}
            </Button>
            <Button type="submit" sm disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : isEdit ? t.common.saveChanges : t.common.save}
            </Button>
          </>
        }
      />

      <Panel className={panelClassName}>
        {/* pb-[1px] + each field's own pb-[17px] = the same 18px as the other sides. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-0 px-[18px] pt-[18px] pb-[1px]">
          <Field label={t.forms.labels.site} required error={vm(errors.site_id?.message)} span2>
            <select className="fld" {...register("site_id")}>
              <option value="">{t.forms.select.site}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.country_code} · {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.forms.labels.type} required error={vm(errors.device_type?.message)}>
            {fixedType ? (
              // Pinned by the entry point: shown for context, submitted hidden so
              // the disabled control can't drop the value from the payload.
              <>
                <select className="fld opacity-70" value={fixedType} disabled onChange={() => {}}>
                  <option value={fixedType}>{t.enums.deviceType[fixedType]}</option>
                </select>
                <input type="hidden" {...register("device_type")} />
              </>
            ) : (
              <select className="fld" {...register("device_type")}>
                {DEVICE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t.enums.deviceType[value]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label={t.forms.labels.brand} error={vm(errors.brand?.message)}>
            <input className="fld" {...register("brand")} placeholder={t.forms.ph.deviceBrand} />
          </Field>
          <Field label={t.forms.labels.model} error={vm(errors.model?.message)}>
            <input className="fld" {...register("model")} placeholder={t.forms.ph.deviceModel} />
          </Field>
          <Field label={t.forms.labels.hostname} error={vm(errors.hostname?.message)}>
            <input className="fld font-mono" {...register("hostname")} placeholder={t.forms.ph.hostname} />
          </Field>

          <Field label={t.forms.labels.mgmtIp} error={vm(errors.mgmt_ip?.message)}>
            <input className="fld font-mono" {...register("mgmt_ip")} placeholder={t.forms.ph.mgmtIp} />
          </Field>
          <Field label={t.forms.labels.firmware} error={vm(errors.firmware?.message)}>
            <input className="fld" {...register("firmware")} placeholder={t.forms.ph.firmware} />
          </Field>
          <Field label={t.forms.labels.serial} error={vm(errors.serial?.message)}>
            <input className="fld font-mono" {...register("serial")} placeholder={t.forms.ph.serial} />
          </Field>

          <Field label={t.forms.labels.installDate} error={vm(errors.install_date?.message)}>
            <input className="fld" type="date" {...register("install_date")} />
          </Field>
          <Field label={t.forms.labels.warrantyEnd} error={vm(errors.warranty_end?.message)}>
            <input className="fld" type="date" {...register("warranty_end")} />
          </Field>
          <Field
            label={t.forms.labels.credentialRef}
            error={vm(errors.credential_ref?.message)}
            help={t.forms.help.credentialRef}
          >
            <input className="fld" {...register("credential_ref")} placeholder={t.forms.ph.credentialRef} />
          </Field>

          <Field label={t.forms.labels.notes} error={vm(errors.notes?.message)} span2>
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
