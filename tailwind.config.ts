import type { Config } from "tailwindcss";

/**
 * Tailwind theme is a thin mapping over the HQ Slate design tokens defined in
 * `app/globals.css` (:root). Components read semantic names; the CSS variables
 * remain the single source of truth (see DESIGN.md §2).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          fg: "var(--sidebar-fg)",
          active: "var(--sidebar-active)",
          "active-fg": "var(--sidebar-active-fg)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          fg: "var(--primary-fg)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          fg: "var(--accent-fg)",
          weak: "var(--accent-weak)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        ok: { DEFAULT: "var(--ok)", bg: "var(--ok-bg)" },
        warn: { DEFAULT: "var(--warn)", bg: "var(--warn-bg)" },
        danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)" },
        info: { DEFAULT: "var(--info)", bg: "var(--info-bg)" },
      },
      // *-stack = the next/font family + the CJK fallback (see globals.css).
      fontFamily: {
        head: "var(--font-head-stack)",
        body: "var(--font-body-stack)",
        mono: "var(--font-mono-stack)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        ring: "var(--ring)",
      },
    },
  },
  plugins: [],
};

export default config;
