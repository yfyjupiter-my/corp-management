import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { getDictionary } from "@/lib/i18n/server";

/** Request a password reset email. Invite-only app — this only helps existing accounts. */
export default async function ForgotPasswordPage() {
  const t = await getDictionary();
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-8">
      <div className="w-[360px] bg-surface border border-border rounded shadow-md p-[26px]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-accent text-accent-fg grid place-items-center font-head font-bold">
            CM
          </div>
          <div className="leading-tight">
            <div className="font-head font-semibold text-[15px]">{t.auth.brand}</div>
            <div className="text-[11px] text-fg-subtle">{t.auth.tagline}</div>
          </div>
        </div>

        <h3 className="text-[17px] font-semibold font-head mb-1">{t.auth.resetTitle}</h3>
        <p className="text-[13px] text-fg-muted mb-5">
          {t.auth.resetSubtitle}
        </p>

        <ForgotPasswordForm />

        <div className="text-[11px] text-fg-subtle text-center mt-5 pt-4 border-t border-border">
          {t.auth.rememberedIt}{" "}
          <a href="/login" className="text-accent hover:underline">
            {t.auth.backToSignIn}
          </a>
        </div>
      </div>
    </div>
  );
}
