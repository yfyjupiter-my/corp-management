"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserSchema, type CreateUserInput } from "@/lib/validation/user";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/i18n/validation";

/**
 * Create a user directly. There is no role or country to pick — every account
 * has the same full access (0006_drop_roles.sql).
 */
export function CreateUserForm() {
  const t = useT();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Zod messages are dictionary keys (13.29) - resolve them for display.
  const vm = (message?: string) => validationMessage(t, message);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
  });

  async function onSubmit(values: CreateUserInput) {
    setServerError(null);
    setDone(false);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? t.users.createFailed);
      return;
    }
    setDone(true);
    reset();
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
      <Field
        label={t.users.fieldPassword}
        error={vm(errors.password?.message)}
        help={t.users.passwordHelp}
      >
        <input
          className="field-input"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
      </Field>

      {serverError && (
        <div className="text-[12px] text-danger bg-danger-bg rounded-sm px-3 py-2">{serverError}</div>
      )}
      {done && (
        <div className="text-[12px] text-ok bg-ok-bg rounded-sm px-3 py-2">
          {t.users.created}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="justify-center">
        {isSubmitting ? t.users.creating : t.users.createUser}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  help,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-fg-muted font-head">{label}</span>
      {children}
      {help && !error && <span className="text-[11px] text-fg-subtle">{help}</span>}
      {error && <span className={cn("text-[11px] text-danger")}>{error}</span>}
    </label>
  );
}
