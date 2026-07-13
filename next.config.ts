import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle for the Docker runtime image.
  // On Vercel, omit it — Vercel has its own build/serving pipeline and
  // `standalone` breaks static/RSC chunk resolution (blank page + 404s).
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  typedRoutes: true,
};

export default nextConfig;
