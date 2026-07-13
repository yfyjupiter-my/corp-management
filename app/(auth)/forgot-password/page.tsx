import { ForgotPasswordForm } from "./ForgotPasswordForm";

/** Request a password reset email. Invite-only app — this only helps existing accounts. */
export default function ForgotPasswordPage() {
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

        <h3 className="text-[17px] font-semibold font-head mb-1">Reset your password</h3>
        <p className="text-[13px] text-fg-muted mb-5">
          Enter your account email and we&apos;ll send you a link to set a new password.
        </p>

        <ForgotPasswordForm />

        <div className="text-[11px] text-fg-subtle text-center mt-5 pt-4 border-t border-border">
          Remembered it?{" "}
          <a href="/login" className="text-accent hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
