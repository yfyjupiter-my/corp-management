"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import { ChevronDownIcon } from "../layout/icons";

export type DropdownItem = {
  label: string;
  href: Route;
  /** Optional one-line hint shown under the label. */
  hint?: string;
};

/**
 * Dropdown menu button — DESIGN.md §5.2 (button) + §5.5 (surface/popover).
 * Server components can render it directly: `items` is plain serializable data,
 * so adding another action is a one-line change at the call site.
 */
export function DropdownMenu({
  label,
  items,
  align = "right",
  sm = false,
  variant = "primary",
}: {
  label: string;
  items: DropdownItem[];
  align?: "left" | "right";
  sm?: boolean;
  variant?: "primary" | "ghost" | "subtle";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape (same pattern as UserMenu).
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
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant={variant}
        sm={sm}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDownIcon
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full mt-1.5 min-w-[190px] z-20 overflow-hidden",
            "bg-surface border border-border rounded-md shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-[13px] text-fg hover:bg-surface-2 transition-colors"
            >
              {item.label}
              {item.hint && (
                <span className="block text-[11px] text-fg-muted">{item.hint}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
