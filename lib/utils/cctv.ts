import { DEFAULT_MIN_RETENTION_DAYS } from "@/lib/constants/countries";

/** Human label for a recorder in selects/tables — brand + model, else location, else id. */
export function recorderLabel(r: {
  id: string;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
}): string {
  const name = [r.brand, r.model].filter(Boolean).join(" ").trim();
  if (name && r.location) return `${name} · ${r.location}`;
  return name || r.location || r.id.slice(0, 8);
}

/**
 * Retention-below-minimum test (TASKS 5.5): a recorder's `retention_days` is
 * below its site country's `country_settings.min_retention_days`, falling back
 * to the company default (30) when the country has no override. A null/unknown
 * retention is not flagged (nothing to compare) — surfaced elsewhere as "—".
 */
export function isBelowRetention(
  retentionDays: number | null | undefined,
  minRetentionDays: number = DEFAULT_MIN_RETENTION_DAYS,
): boolean {
  if (retentionDays == null) return false;
  return retentionDays < minRetentionDays;
}
