"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { updateUserSchema, type UpdateUserInput } from "@/lib/validation/user";
import { Button } from "@/components/ui/Button";
import { PageHead } from "@/components/ui/PageHead";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/i18n/validation";

/**
 * Edit an existing user (PRD Story 4, revised). Name comes from `profiles`,
 * email from `auth.users`; the password box is blank on purpose — filling it
 * resets the password, leaving it empty keeps the current one.
 *
 * There is no role or country to pick: every account has the same full access
 * (0006_drop_roles.sql).
 */
export function EditUserForm({
  user,
  title,
  subtitle,
}: {
  user: UpdateUserInput & { id: string };
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const t = useT();
  // Zod messages are dictionary keys (13.29) — resolve them for display.
  const vm = (message?: string) => validationMessage(t, message);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { email: user.email, full_name: user.full_name, password: "" },
  });

  async function onSubmit(values: UpdateUserInput) {
    setServerError(null);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? t.users.saveFailed);
      return;
    }
    router.push("/users");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Heading inside the form so Cancel/Save sit on the title line, matching
          SiteForm — the submit button then needs no `form=` reference. */}
      <PageHead
        eyebrow={t.nav.users}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {serverError && <span className="text-[12px] text-danger">{serverError}</span>}
            <Button type="button" variant="ghost" sm onClick={() => router.back()}>
              {t.common.cancel}
            </Button>
            <Button type="submit" sm disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.common.saveChanges}
            </Button>
          </>
        }
      />

      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0 px-[18px] pt-[18px] pb-[1px]">
          <Field label={t.users.fieldFullName} required error={vm(errors.full_name?.message)}>
            <input className="fld" {...register("full_name")} placeholder="Nadia Rahman" />
          </Field>
          <Field label={t.users.fieldEmail} required error={vm(errors.email?.message)}>
            <input className="fld" type="email" {...register("email")} placeholder="user@example.com" />
          </Field>
          <Field
            label={t.users.fieldNewPassword}
            error={vm(errors.password?.message)}
            help={t.users.newPasswordHelp}
          >
            <input
              className="fld"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
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

/** One labelled control; help/error share a fixed strip so rows stay level. */
function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  const message = error ?? help;
  return (
    <label className="relative flex flex-col gap-1.5 pb-[17px]">
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
