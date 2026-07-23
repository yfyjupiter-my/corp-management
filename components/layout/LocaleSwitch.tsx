"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * Two-position language switch (TASKS.md 13.13) — a segmented control, styled
 * from existing DESIGN.md tokens only. Follows the `useTransition` + server
 * action pattern of the logout button in `UserMenu.tsx`; the action revalidates
 * the layout, so the whole tree re-renders in the new language.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const active = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t.topbar.language}
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 bg-surface-2 border border-border rounded-pill",
        className,
      )}
    >
      {LOCALES.map((l) => {
        const isActive = l === active;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={isActive}
            disabled={pending || isActive}
            onClick={() => startTransition(() => setLocale(l))}
            className={cn(
              "px-2.5 py-1 rounded-pill text-xs font-semibold font-head transition-colors",
              isActive
                ? "bg-surface shadow-sm text-fg"
                : "text-fg-subtle hover:text-fg disabled:hover:text-fg-subtle",
              pending && "opacity-60",
            )}
          >
            {LOCALE_LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
