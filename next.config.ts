import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle for the Docker runtime image.
  output: "standalone",
  reactStrictMode: true,
  typedRoutes: true,
};

export default nextConfig;
