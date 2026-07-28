import Link from "next/link";
import { SearchIcon } from "./icons";
import { LocaleSwitch } from "./LocaleSwitch";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Topbar — search + language switch. DESIGN.md §5.7.
 *
 * The role pill that used to sit on the right was removed with the role system
 * (0006_drop_roles.sql): every user has the same access, so it had nothing left
 * to report. The signed-in identity lives in the sidebar's UserMenu.
 */
export async function Topbar() {
  const t = await getDictionary();
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
    </header>
  );
}
