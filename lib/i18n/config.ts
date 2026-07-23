/**
 * Locale reference data (TASKS.md Phase 13 — EN / 繁體中文 switch).
 * No imports, so this module is safe on both sides of the RSC boundary.
 */
export const LOCALES = ["en", "zh-TW"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the active locale; written by `setLocale`, read by `getLocale`. */
export const LOCALE_COOKIE = "locale";

/** Switch labels — each rendered in its own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  "zh-TW": "繁中",
};

/** BCP 47 tag for the `<html lang>` attribute. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  "zh-TW": "zh-Hant-TW",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
