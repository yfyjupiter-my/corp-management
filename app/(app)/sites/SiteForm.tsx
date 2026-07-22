"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { siteSchema, type SiteInput } from "@/lib/validation/site";
import { COUNTRIES, COUNTRY_LIST, type CountryCode } from "@/lib/constants/countries";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/PageHead";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils/cn";

/**
 * Create/edit a site (PRD Story 1). React Hook Form + shared Zod schema; mutations
 * go to a Route Handler so the same endpoint can back a future read-only API and
 * is easy to RLS-test. Selecting a country pre-fills its IANA timezone + currency
 * (finalize.md Part B), which the user can still override.
 */
export function SiteForm({
  site,
  eyebrow,
  title,
  subtitle,
  panelClassName,
}: {
  site?: SiteInput & { id: string; updated_at?: string };
  /** Page heading is rendered here so Cancel/Save can sit on the title line. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  panelClassName?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(site);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultCountry = (site?.country_code ?? "MY") as CountryCode;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SiteInput>({
    resolver: zodResolver(siteSchema),
    defaultValues: site ?? {
      country_code: defaultCountry,
      timezone: COUNTRIES[defaultCountry].timezone,
      currency: COUNTRIES[defaultCountry].currency,
    },
  });

  function onCountryChange(code: string) {
    const meta = COUNTRIES[code as CountryCode];
    if (!meta) return;
    // Default TZ + currency to the chosen country; user can still edit.
    setValue("timezone", meta.timezone, { shouldValidate: true });
    setValue("currency", meta.currency, { shouldValidate: true });
  }

  async function onSubmit(values: SiteInput) {
    setServerError(null);
    const res = await fetch(isEdit ? `/api/sites/${site!.id}` : "/api/sites", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      // BUS-6: echo the updated_at we loaded so the server can reject a save that
      // would clobber a concurrent change (409 → shown in serverError below).
      body: JSON.stringify(
        isEdit ? { ...values, expected_updated_at: site!.updated_at } : values,
      ),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Could not save site.");
      return;
    }
    const body = await res.json().catch(() => ({}));
    router.push(isEdit ? `/sites/${site!.id}` : `/sites/${body.id ?? ""}`);
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
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Save site"}
            </Button>
          </>
        }
      />

      <Panel className={panelClassName}>
        {/* pb-[1px] + each field's own pb-[17px] = the same 18px as the other sides. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-0 px-[18px] pt-[18px] pb-[1px]">
          <Field label="Country" required error={errors.country_code?.message}>
            <select
              className="fld"
              {...register("country_code", { onChange: (e) => onCountryChange(e.target.value) })}
            >
              {COUNTRY_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Site name" required error={errors.name?.message} span2>
            <input className="fld" {...register("name")} placeholder="Kuala Lumpur HQ" />
          </Field>

          <Field label="Address" error={errors.address?.message} span2>
            <input className="fld" {...register("address")} placeholder="Level 12, Menara …" />
          </Field>
          <Field label="Timezone" required error={errors.timezone?.message}>
            <input className="fld font-mono" {...register("timezone")} placeholder="Asia/Kuala_Lumpur" />
          </Field>

          <Field label="Currency" required error={errors.currency?.message}>
            <input className="fld font-mono uppercase" maxLength={3} {...register("currency")} placeholder="MYR" />
          </Field>
          <Field label="Contact name" error={errors.contact_name?.message}>
            <input className="fld" {...register("contact_name")} placeholder="Site IT lead" />
          </Field>
          <Field label="Contact phone" error={errors.contact_phone?.message}>
            <input className="fld font-mono" {...register("contact_phone")} placeholder="+60 …" />
          </Field>

          <Field label="Contact email" error={errors.contact_email?.message} span2>
            <input className="fld" {...register("contact_email")} placeholder="it.kl@example.com" />
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
 * every row is the same 17px.
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
