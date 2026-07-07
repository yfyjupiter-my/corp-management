import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

/** Invite-only sign-in — no public sign-up (DESIGN.md §5.9). */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-8">
      <div className="w-[360px] bg-surface border border-border rounded shadow-md p-[26px]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-accent text-accent-fg grid place-items-center font-head font-bold">
            CM
          </div>
          <div className="leading-tight">
            <div className="font-head font-semibold text-[15px]">Corp Management</div>
            <div className="text-[11px] text-fg-subtle">SEA IT Infrastructure Registry</div>
          </div>
        </div>

        <h3 className="text-[17px] font-semibold font-head mb-1">Sign in</h3>
        <p className="text-[13px] text-fg-muted mb-5">
          Use the account your HQ admin created for you.
        </p>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="text-[11px] text-fg-subtle text-center mt-5 pt-4 border-t border-border">
          No public sign-up · accounts invited by HQ admin
        </div>
      </div>
    </div>
  );
}
