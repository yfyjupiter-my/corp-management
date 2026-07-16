import type { Metadata } from "next";
import { Lexend, Source_Sans_3, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Corp Management — SEA IT Registry",
  description:
    "Network & CCTV infrastructure registry for the company's Southeast Asia offices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fontHead.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
