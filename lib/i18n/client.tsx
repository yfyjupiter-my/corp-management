"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { dictionaryFor } from "./dictionaries";
import type { Dictionary } from "./dictionaries/en";

interface I18nValue {
  dict: Dictionary;
  locale: Locale;
}

/**
 * No fallback dictionary on purpose: `useT()` outside the provider throws
 * rather than hiding a missing provider behind silently-English UI.
 */
const I18nContext = createContext<I18nValue | null>(null);

/**
 * Mounted once in `app/layout.tsx` (13.15) with the server-resolved locale, so
 * client components read the same strings as the server ones —
 * `t.common.save`, identical shape to `getDictionary()`.
 *
 * The prop is the **locale string, not the dictionary**: interpolating entries
 * are functions (`country.title(name)`, `audit.showFields(n)`), and a function
 * cannot cross the RSC boundary — passing the resolved object from the server
 * layout throws "Functions cannot be passed directly to Client Components" at
 * runtime. Resolving it here keeps only a string in the payload. The cost is
 * that both dictionaries are bundled client-side; they are plain string maps,
 * and correctness beats the few KB.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ dict: dictionaryFor(locale), locale }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useT/useLocale must be used inside <I18nProvider>.");
  return value;
}

/** `const t = useT();` — the client-side twin of `await getDictionary()`. */
export function useT(): Dictionary {
  return useI18n().dict;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
