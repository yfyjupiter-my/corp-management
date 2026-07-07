"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push((params.get("redirectedFrom") as never) ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base"
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-base"
          placeholder="••••••••"
        />
      </Field>

      {error && (
        <div className="text-[12px] text-danger bg-danger-bg rounded-sm px-3 py-2">{error}</div>
      )}

      <Button type="submit" disabled={loading} className="w-full justify-center mt-1">
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <style>{`
        .input-base {
          font-size: 13px; color: var(--fg); background: var(--surface);
          border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
          padding: 9px 11px; transition: border .15s, box-shadow .15s; width: 100%;
        }
        .input-base::placeholder { color: var(--fg-subtle); }
        .input-base:focus { outline: none; border-color: var(--accent); box-shadow: var(--ring); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-fg-muted font-head">{label}</span>
      {children}
    </label>
  );
}
