import type { Metadata } from "next";
import { Lexend, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { HTML_LANG } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { dictionaryFor } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/client";
import "./globals.css";

// Self-hosted via next/font — no external <link>, no layout-shift, and the
// families are exposed to globals.css through these CSS variables.
const fontHead = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-head",
  display: "swap",
});

const fontBody = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = dictionaryFor(await getLocale());
  return { title: t.auth.metaTitle, description: t.auth.metaDescription };
}

// Reading the locale cookie opts the tree into dynamic rendering; nearly every
// page is already `force-dynamic`, so in practice only `app/not-found.tsx`
// loses static optimization.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${fontHead.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body>
        {/* Locale string only — the dictionary holds functions, which cannot
            cross the RSC boundary. The provider resolves it client-side. */}
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
