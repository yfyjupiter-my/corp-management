/**
 * Country reference data (finalize.md Part B — Country → defaults).
 * All four countries exist from day one so RLS + navigation are complete;
 * only Malaysia (pilot) is pre-populated with sample data.
 */
export const COUNTRY_CODES = ["VN", "TH", "ID", "MY"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface CountryMeta {
  code: CountryCode;
  name: string;
  timezone: string; // IANA
  currency: string; // ISO 4217
}

export const COUNTRIES: Record<CountryCode, CountryMeta> = {
  VN: { code: "VN", name: "Vietnam", timezone: "Asia/Ho_Chi_Minh", currency: "VND" },
  TH: { code: "TH", name: "Thailand", timezone: "Asia/Bangkok", currency: "THB" },
  ID: { code: "ID", name: "Indonesia", timezone: "Asia/Jakarta", currency: "IDR" },
  MY: { code: "MY", name: "Malaysia", timezone: "Asia/Kuala_Lumpur", currency: "MYR" },
};

export const COUNTRY_LIST: CountryMeta[] = COUNTRY_CODES.map((c) => COUNTRIES[c]);

export const PILOT_COUNTRY: CountryCode = "MY";

/** Company-wide defaults; per-country overrides live in `country_settings`. */
export const DEFAULT_MIN_RETENTION_DAYS = 30;
export const DEFAULT_REVIEW_CYCLE_MONTHS = 6;

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}
