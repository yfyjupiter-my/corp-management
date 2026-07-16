"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { vpnLinkSchema, type VpnLinkInput } from "@/lib/validation/network";
import { VPN_STATUSES } from "@/lib/constants/enums";
import { Button } from "@/components/ui/Button";

interface Site {
  id: string;
  name: string;
  country_code: string;
}

/**
 * VPN/WAN link create form (React Hook Form + Zod). `peer` is free-text for an
 * HQ/external endpoint; `peer_site_id` optionally points at another site in the
 * registry. Mutations go to `/api/vpn-links`; RLS scopes the owning site.
 */
export function VpnForm({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VpnLinkInput>({
    resolver: zodResolver(vpnLinkSchema),
    defaultValues: { status: "unknown" },
  });

  async function onSubmit(values: VpnLinkInput) {
    setServerError(null);
    const res = await fetch("/api/vpn-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Could not save VPN link.");
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
        <Field label="Status" required error={errors.status?.message}>
          <select className="fld" {...register("status")}>
            {VPN_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Peer (free-text)"
          error={errors.peer?.message}
          help="HQ or an external endpoint. Use the site selector below instead when the peer is another registered site."
        >
          <input className="fld" {...register("peer")} placeholder="HQ / AWS ap-southeast-1" />
        </Field>
        <Field label="Peer site" error={errors.peer_site_id?.message}>
          <select className="fld" {...register("peer_site_id")}>
            <option value="">— none —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.country_code} · {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tunnel type" error={errors.tunnel_type?.message}>
          <input className="fld" {...register("tunnel_type")} placeholder="IPsec / WireGuard" />
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
          {isSubmitting ? "Saving…" : "Save VPN link"}
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
