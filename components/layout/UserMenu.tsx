"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/client";
import { signOut } from "@/lib/actions/auth";
import type { CurrentUser } from "@/lib/auth";
import { ChevronUpIcon, LogoutIcon } from "./icons";

/**
 * Sidebar footer user profile — clickable, opens an upward dropdown with the
 * account details and a logout action. DESIGN.md §4 sidebar palette.
 */
export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const isHq = user.role === "hq_admin";
  // "HQ Admin · all countries" / "Manager · MY" — the country code is data, so
  // it stays outside the dictionary.
  const roleLine = isHq
    ? `${t.topbar.hqAdmin} · ${t.topbar.allCountries}`
    : `${t.topbar.manager} · ${user.countryCode}`;

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-auto border-t border-white/10 pt-1.5">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-sidebar border border-white/15 rounded-md shadow-lg overflow-hidden z-10">
          <div className="px-3 py-2.5 border-b border-white/10 leading-tight">
            <div className="text-white text-[13px] font-semibold truncate">
              {user.fullName ?? user.email}
            </div>
            {user.email && (
              <div className="text-[11px] text-sidebar-fg/70 truncate">{user.email}</div>
            )}
            <div className="text-[11px] text-sidebar-fg/70 truncate">
              {roleLine}
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => signOut())}
            className="w-full flex items-center gap-2.5 px-3 py-[9px] text-[13px] font-medium text-sidebar-fg hover:bg-white/[.06] transition-colors disabled:opacity-60"
          >
            <LogoutIcon />
            {pending ? t.auth.signingOut : t.auth.logOut}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2.5 px-2 py-2 rounded-sm text-left transition-colors",
          open ? "bg-white/[.08]" : "hover:bg-white/[.06]",
        )}
      >
        <div className="w-8 h-8 flex-none rounded-md bg-white/10 grid place-items-center font-head font-semibold text-white text-xs">
          {initials(user.fullName ?? user.email ?? "?")}
        </div>
        <div className="leading-tight min-w-0 flex-1">
          <div className="text-white text-[13px] font-semibold truncate">
            {user.fullName ?? user.email}
          </div>
          <div className="text-[11px] text-sidebar-fg/70 truncate">
            {roleLine}
          </div>
        </div>
        <ChevronUpIcon
          size={14}
          className={cn(
            "flex-none text-sidebar-fg/60 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
