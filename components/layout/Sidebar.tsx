"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { COUNTRY_LIST } from "@/lib/constants/countries";
import type { CurrentUser } from "@/lib/auth";
import {
  DashboardIcon,
  NetworkIcon,
  CctvIcon,
  RenewalsIcon,
  UsersIcon,
  AuditIcon,
} from "./icons";

interface SidebarProps {
  user: CurrentUser;
  siteCounts: Record<string, number>; // country_code -> count
  renewalsCount?: number;
}

/** Left navigation rail — DESIGN.md §4 + §5.1. */
export function Sidebar({ user, siteCounts, renewalsCount }: SidebarProps) {
  const pathname = usePathname();
  const isHq = user.role === "hq_admin";

  // Country managers only see their own country in the Countries group.
  const countries = isHq
    ? COUNTRY_LIST
    : COUNTRY_LIST.filter((c) => c.code === user.countryCode);

  return (
    <aside className="w-56 flex-none bg-sidebar text-sidebar-fg p-3 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-4">
        <div className="w-[30px] h-[30px] rounded-lg bg-accent text-accent-fg grid place-items-center font-head font-bold text-[15px]">
          CM
        </div>
        <div className="leading-tight">
          <div className="font-head font-semibold text-white text-sm">Corp Mgmt</div>
          <div className="text-[11px] text-sidebar-fg/70">SEA IT Registry</div>
        </div>
      </div>

      <NavItem href="/dashboard" active={pathname === "/dashboard"} icon={<DashboardIcon />}>
        Dashboard
      </NavItem>

      <Group label="Countries" />
      {countries.map((c) => (
        <NavItem
          key={c.code}
          href={`/countries/${c.code}`}
          active={pathname === `/countries/${c.code}`}
          count={siteCounts[c.code]}
        >
          <span className="inline-block w-3.5 text-[11px] font-mono text-sidebar-fg/60">
            {c.code}
          </span>
          {c.name}
        </NavItem>
      ))}

      <Group label="Modules" />
      <NavItem href="/network" active={pathname.startsWith("/network")} icon={<NetworkIcon />}>
        Network
      </NavItem>
      <NavItem href="/cctv" active={pathname.startsWith("/cctv")} icon={<CctvIcon />}>
        CCTV
      </NavItem>
      <NavItem
        href="/renewals"
        active={pathname.startsWith("/renewals")}
        icon={<RenewalsIcon />}
        count={renewalsCount}
      >
        Renewals
      </NavItem>

      {isHq && (
        <>
          <Group label="Administration" />
          <NavItem href="/users" active={pathname.startsWith("/users")} icon={<UsersIcon />}>
            Users &amp; roles
          </NavItem>
          <NavItem href="/audit" active={pathname.startsWith("/audit")} icon={<AuditIcon />}>
            Audit log
          </NavItem>
        </>
      )}

      {/* Footer: current user */}
      <div className="mt-auto flex items-center gap-2.5 px-2 pt-2.5 pb-0.5 border-t border-white/10">
        <div className="w-8 h-8 rounded-md bg-white/10 grid place-items-center font-head font-semibold text-white text-xs">
          {initials(user.fullName ?? user.email ?? "?")}
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-white text-[13px] font-semibold truncate">
            {user.fullName ?? user.email}
          </div>
          <div className="text-[11px] text-sidebar-fg/70 truncate">
            {isHq ? "HQ Admin · all countries" : `Manager · ${user.countryCode}`}
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  active,
  icon,
  count,
  children,
}: {
  href: string;
  active: boolean;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href as never}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-[9px] rounded-sm text-[13px] font-medium transition-colors",
        active
          ? "bg-sidebar-active text-sidebar-active-fg font-semibold"
          : "text-sidebar-fg hover:bg-white/[.06]",
      )}
    >
      {icon}
      <span className="flex items-center gap-2">{children}</span>
      {count != null && (
        <span className="ml-auto font-mono text-[11px] bg-white/10 text-sidebar-active-fg px-2 py-px rounded-pill">
          {count}
        </span>
      )}
    </Link>
  );
}

function Group({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-50 mx-2.5 mt-4 mb-1.5">
      {label}
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
