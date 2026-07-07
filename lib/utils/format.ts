import { COUNTRIES, type CountryCode } from "@/lib/constants/countries";

/** Format a monthly cost with its per-site currency (finalize.md — Money). */
export function formatMoney(
  amount: number | null | undefined,
  currency: string,
): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Short date, timezone-agnostic display for stored timestamps. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Days remaining until a target date (negative = already past). */
export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * A record is stale when never verified or verified before its review-cycle
 * cutoff (finalize.md — Common columns). `reviewCycleMonths` defaults to 6.
 */
export function isStale(
  lastVerifiedAt: string | Date | null | undefined,
  reviewCycleMonths = 6,
): boolean {
  if (!lastVerifiedAt) return true;
  const d = typeof lastVerifiedAt === "string" ? new Date(lastVerifiedAt) : lastVerifiedAt;
  if (Number.isNaN(d.getTime())) return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - reviewCycleMonths);
  return d.getTime() < cutoff.getTime();
}

export function countryName(code: CountryCode | string): string {
  return (COUNTRIES as Record<string, { name: string }>)[code]?.name ?? code;
}
