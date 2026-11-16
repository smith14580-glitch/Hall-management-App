import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/dashboard", destination: "/" }];
  },
  async redirects() {
    return [
      { source: "/audit-logs", destination: "/", permanent: false },
      { source: "/audit-logs/:path*", destination: "/", permanent: false },
      { source: "/auditLog", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
