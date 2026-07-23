import Link from "next/link";
import { SearchIcon } from "./icons";
import { LocaleSwitch } from "./LocaleSwitch";
import { getDictionary } from "@/lib/i18n/server";
import type { CurrentUser } from "@/lib/auth";

/** Topbar — search + language switch + role pill. DESIGN.md §5.7. */
export async function Topbar({ user }: { user: CurrentUser }) {
  const t = await getDictionary();
  const isHq = user.role === "hq_admin";
  return (
    <header className="flex items-center gap-3.5 px-5 py-[13px] border-b border-border bg-surface">
      <Link
        href="/search"
        className="flex-1 max-w-[440px] flex items-center gap-2.5 h-[38px] px-[13px] bg-surface-2 border border-border rounded-pill text-fg-subtle text-[13px]"
      >
        <SearchIcon />
        <span className="truncate">{t.topbar.searchPlaceholder}</span>
        <span className="ml-auto font-mono text-[11px] border border-border-strong rounded-[5px] px-1.5 text-fg-subtle">
          ⌘K
        </span>
      </Link>

      <LocaleSwitch className="ml-auto" />

      <span className="inline-flex items-center gap-[7px] text-xs font-semibold text-accent bg-accent-weak px-3 py-1.5 rounded-pill font-head">
        <span className="w-[7px] h-[7px] rounded-full bg-accent" />
        {isHq ? t.topbar.hqAdmin : `${user.countryCode} ${t.topbar.manager}`}
      </span>
    </header>
  );
}
