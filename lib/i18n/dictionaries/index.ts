import type { Locale } from "../config";
import { en, type Dictionary } from "./en";
import { zhTW } from "./zh-TW";

/** Every locale's dictionary, keyed by `Locale` — exhaustive by construction. */
export const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  "zh-TW": zhTW,
};

/**
 * Pure lookup with no request context, so it is safe anywhere —
 * server components, middleware, or tests.
 */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
