import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Tooling often hits the dev server via 127.0.0.1 while Next binds localhost.
  // Without this, Turbopack HMR can be blocked and client components fail to hydrate.
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pg"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "@tanstack/react-table",
    ],
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
