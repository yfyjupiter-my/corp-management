import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { dictionaryFor, type Dictionary } from "./dictionaries";

/**
 * Locale accessors for the 38 server components (TASKS.md 13.4).
 *
 * A pure cookie read: middleware (13.11) seeds the cookie from
 * `profiles.locale` on a request that arrives without one, so precedence is
 * cookie → `profiles.locale` → `en` without a query on every render.
 *
 * Importing `next/headers` makes this module server-only — client components
 * read the dictionary through `I18nProvider` in `./client` instead.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** `const t = await getDictionary();` — the two-line pattern used by every page. */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaryFor(await getLocale());
}
