"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { inviteUserSchema, type InviteUserInput } from "@/lib/validation/user";
import { COUNTRY_LIST } from "@/lib/constants/countries";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/i18n/validation";

export function InviteForm() {
  const t = useT();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Zod messages are dictionary keys (13.29) - resolve them for display.
  const vm = (message?: string) => validationMessage(t, message);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { role: "country_manager" },
  });

  const role = watch("role");

  async function onSubmit(values: InviteUserInput) {
    setServerError(null);
    setDone(false);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? t.users.inviteFailed);
      return;
    }
    setDone(true);
    reset({ role: "country_manager" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      <Field label={t.users.fieldFullName} error={vm(errors.full_name?.message)}>
        <input className="field-input" {...register("full_name")} placeholder="Nadia Rahman" />
      </Field>
      <Field label={t.users.fieldEmail} error={vm(errors.email?.message)}>
        <input className="field-input" type="email" {...register("email")} placeholder="user@example.com" />
      </Field>
      <Field label={t.users.fieldRole} error={vm(errors.role?.message)}>
        <select className="field-input" {...register("role")}>
          <option value="country_manager">{t.users.roleCountryManager}</option>
          <option value="hq_admin">{t.users.roleHqAdmin}</option>
        </select>
      </Field>
      {role === "country_manager" && (
        <Field label={t.users.fieldCountry} error={vm(errors.country_code?.message)}>
          <select className="field-input" {...register("country_code")}>
            <option value="">{t.users.selectPlaceholder}</option>
            {COUNTRY_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {t.countries[c.code]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {serverError && (
        <div className="text-[12px] text-danger bg-danger-bg rounded-sm px-3 py-2">{serverError}</div>
      )}
      {done && (
        <div className="text-[12px] text-ok bg-ok-bg rounded-sm px-3 py-2">
          {t.users.inviteSent}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="justify-center">
        {isSubmitting ? t.users.sending : t.users.sendInvite}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-fg-muted font-head">{label}</span>
      {children}
      {error && <span className={cn("text-[11px] text-danger")}>{error}</span>}
    </label>
  );
}
