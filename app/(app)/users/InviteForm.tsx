"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { inviteUserSchema, type InviteUserInput } from "@/lib/validation/user";
import { COUNTRY_LIST } from "@/lib/constants/countries";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export function InviteForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
      setServerError(body.error ?? "Failed to send invite.");
      return;
    }
    setDone(true);
    reset({ role: "country_manager" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      <Field label="Full name" error={errors.full_name?.message}>
        <input className="fld" {...register("full_name")} placeholder="Nadia Rahman" />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <input className="fld" type="email" {...register("email")} placeholder="user@example.com" />
      </Field>
      <Field label="Role" error={errors.role?.message}>
        <select className="fld" {...register("role")}>
          <option value="country_manager">Country Manager</option>
          <option value="hq_admin">HQ Admin</option>
        </select>
      </Field>
      {role === "country_manager" && (
        <Field label="Country" error={errors.country_code?.message}>
          <select className="fld" {...register("country_code")}>
            <option value="">Select…</option>
            {COUNTRY_LIST.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
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
          Invite sent. The user will set their password from the email link.
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="justify-center">
        {isSubmitting ? "Sending…" : "Send invite"}
      </Button>

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
