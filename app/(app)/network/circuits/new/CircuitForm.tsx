"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ispCircuitSchema, type IspCircuitInput } from "@/lib/validation/network";
import { CIRCUIT_TYPES } from "@/lib/constants/enums";
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

// `static_ips` is a text[] — collected here as free text and split on submit, so
// the resolver validates every other field and the server validates the array.
const formSchema = ispCircuitSchema.omit({ static_ips: true });
type CircuitFormInput = Omit<IspCircuitInput, "static_ips">;

/**
 * Client form (React Hook Form + Zod) for creating OR editing an ISP circuit.
 * Create → `POST /api/circuits`; edit → `PATCH /api/circuits/[id]` carrying the
 * last-read `updated_at` for BUS-6 optimistic concurrency (409 on a concurrent
 * change). The Zod schema shared with the server also runs the secrets guard.
 * RLS scopes which sites the caller may attach a circuit to.
 */
export function CircuitForm({
  sites,
  circuit,
  eyebrow,
  title,
  subtitle,
  panelClassName,
}: {
  sites: Site[];
  /** Edit mode: the page maps DB nulls away and passes `updated_at` for BUS-6. */
  circuit?: CircuitFormInput & {
    id: string;
    updated_at?: string;
    static_ips?: string[];
  };
  /** Page heading is rendered here so Cancel/Save can sit on the title line. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  panelClassName?: string;
}) {
  const router = useRouter();
  const t = useT();
  const isEdit = Boolean(circuit);
  const [serverError, setServerError] = useState<string | null>(null);
  // text[] lives outside RHF (see `formSchema`), so seed it from the row here.
  const [staticIps, setStaticIps] = useState((circuit?.static_ips ?? []).join("\n"));
  // Zod messages are dictionary keys (13.29) - resolve them for display.
  const vm = (message?: string) => validationMessage(t, message);


  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CircuitFormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: circuit ?? { type: "fiber" },
  });

  async function onSubmit(values: CircuitFormInput) {
    setServerError(null);
    // Split on commas/whitespace/newlines; drop blanks. Server re-validates each.
    const ips = staticIps
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch(isEdit ? `/api/circuits/${circuit!.id}` : "/api/circuits", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        // On edit always send the array, empty included — the PATCH is partial,
        // so an omitted key would leave a cleared box's old IPs in the row.
        static_ips: isEdit ? ips : ips.length ? ips : undefined,
        ...(isEdit ? { expected_updated_at: circuit!.updated_at } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? t.forms.saveFailed.circuit);
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
          <Field label={t.forms.labels.type} required error={vm(errors.type?.message)}>
            <select className="fld" {...register("type")}>
              {CIRCUIT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t.enums.circuitType[value]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.forms.labels.provider} required error={vm(errors.provider?.message)}>
            <input className="fld" {...register("provider")} placeholder={t.forms.ph.provider} />
          </Field>
          <Field label={t.forms.labels.circuitId} error={vm(errors.circuit_id?.message)}>
            <input className="fld font-mono" {...register("circuit_id")} placeholder={t.forms.ph.circuitId} />
          </Field>
          <Field label={t.forms.labels.bandwidth} error={vm(errors.bandwidth?.message)}>
            <input className="fld" {...register("bandwidth")} placeholder={t.forms.ph.bandwidth} />
          </Field>

          <Field label={t.forms.labels.staticIps} help={t.forms.help.staticIps} span2>
            <textarea
              className="fld font-mono min-h-[44px]"
              value={staticIps}
              onChange={(e) => setStaticIps(e.target.value)}
              placeholder={t.forms.ph.staticIps}
            />
          </Field>
          <Field label={t.forms.labels.monthlyCost} error={vm(errors.monthly_cost?.message)}>
            <input
              className="fld"
              type="number"
              step="0.01"
              min="0"
              {...register("monthly_cost")}
              placeholder={t.forms.ph.monthlyCost}
            />
          </Field>

          <Field label={t.forms.labels.contractStart} error={vm(errors.contract_start?.message)}>
            <input className="fld" type="date" {...register("contract_start")} />
          </Field>
          <Field label={t.forms.labels.contractEnd} error={vm(errors.contract_end?.message)}>
            <input className="fld" type="date" {...register("contract_end")} />
          </Field>
          <Field label={t.forms.labels.supportPhone} error={vm(errors.support_phone?.message)}>
            <input className="fld" {...register("support_phone")} placeholder={t.forms.ph.supportPhone} />
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
