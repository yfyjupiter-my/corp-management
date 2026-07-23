import { LocaleSwitch } from "@/components/layout/LocaleSwitch";

/**
 * Auth shell (TASKS.md 13.17) — the three public pages (login, forgot-password,
 * reset-password) render outside the app chrome, so without this the switch
 * would be unreachable for anyone who cannot read English before signing in.
 * One layout instead of three page edits; the pages keep their own centering.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-4 right-4 z-10">
        <LocaleSwitch />
      </div>
      {children}
    </>
  );
}
