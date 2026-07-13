"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Recovery link lands on the shared callback, which exchanges the code for a
      // session and forwards to /reset-password where the user picks a new password.
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Always show success regardless of whether the email exists — avoids leaking
    // which addresses have accounts.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-[13px] text-fg-muted bg-surface-2 border border-border rounded-sm px-3 py-3">
        If an account exists for <span className="text-fg font-medium">{email}</span>, a
        password reset link is on its way. Check your inbox and spam folder.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-fg-muted font-head">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base"
          placeholder="you@example.com"
        />
      </label>

      {error && (
        <div className="text-[12px] text-danger bg-danger-bg rounded-sm px-3 py-2">{error}</div>
      )}

      <Button type="submit" disabled={loading} className="w-full justify-center mt-1">
        {loading ? "Sending…" : "Send reset link"}
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
