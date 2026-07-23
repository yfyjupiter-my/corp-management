import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getDictionary();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-bg text-center p-8">
      <div className="font-head text-[52px] font-bold tracking-tight text-fg-subtle">404</div>
      <h1 className="text-lg font-semibold font-head">{t.auth.notFoundTitle}</h1>
      <p className="text-[13px] text-fg-muted">{t.auth.notFoundBody}</p>
      <Link href="/dashboard" className="text-accent text-[13px] font-semibold mt-2">
        {t.auth.backToDashboard}
      </Link>
    </div>
  );
}
