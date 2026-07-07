/**
 * Inline SVG icons — DESIGN.md §6. viewBox 0 0 24 24, stroke=currentColor,
 * stroke-width 2. Color inherited from the parent.
 */
type IconProps = { className?: string; size?: number };

const svg = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
});

export const DashboardIcon = ({ size = 17, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

export const NetworkIcon = ({ size = 17, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <rect x="3" y="3" width="18" height="6" rx="1" />
    <rect x="3" y="15" width="18" height="6" rx="1" />
    <path d="M7 9v6M17 9v6" />
  </svg>
);

export const CctvIcon = ({ size = 17, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M2 7h13v10H2z" />
    <path d="M15 10l7-3v10l-7-3" />
  </svg>
);

export const RenewalsIcon = ({ size = 17, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const UsersIcon = ({ size = 17, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
    <path d="M16 4a3 3 0 0 1 0 6M18 15c2 .4 3 2 3 5" />
  </svg>
);

export const AuditIcon = ({ size = 17, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M4 4h16v16H4z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

export const SitesIcon = ({ size = 17, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export const SearchIcon = ({ size = 16, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const PlusIcon = ({ size = 16, className }: IconProps) => (
  <svg {...svg(size, className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
