"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/utils/safe-redirect";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/client";

const MIN_LENGTH = 8;

export function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // The recovery flow must have granted a session (via /auth/callback) before we
  // can update the password. If there's none, the link was invalid or expired.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      // Runtime-validated relative path (SEC-3); it can't be a statically-known
      // typedRoutes literal, so cast to Route rather than the misleading `never`.
      router.push(safeInternalPath(params.get("redirectedFrom")) as Route);
      router.refresh();
    }, 1200);
  }

  if (ready === false) {
    return (
      <div className="flex flex-col gap-3.5">
        <div className="text-[13px] text-danger bg-danger-bg rounded-sm px-3 py-3">
          {t.auth.linkInvalid}
        </div>
        <a href="/forgot-password">
          <Button className="w-full justify-center">{t.auth.requestNewLink}</Button>
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-[13px] text-fg-muted bg-surface-2 border border-border rounded-sm px-3 py-3">
        {t.auth.passwordUpdated}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-fg-muted font-head">{t.auth.newPassword}</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input"
          placeholder="••••••••"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-fg-muted font-head">{t.auth.confirmPassword}</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field-input"
          placeholder="••••••••"
        />
      </label>

      {error && (
        <div className="text-[12px] text-danger bg-danger-bg rounded-sm px-3 py-2">{error}</div>
      )}

      <Button
        type="submit"
        disabled={loading || ready === null}
        className="w-full justify-center mt-1"
      >
        {loading ? t.auth.updating : t.auth.updatePassword}
      </Button>
    </form>
  );
}
