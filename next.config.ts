import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// When the dev server is accessed via explicit IP (127.0.0.1) rather than the
// hostname it binds to (localhost), Next.js sets x-forwarded-host to localhost
// while the browser sends Origin: http://127.0.0.1:PORT. The two layers that
// need the same exception are distinct:
//   1. allowedDevOrigins  — Turbopack HMR WebSocket connections
//   2. experimental.serverActions.allowedOrigins — Server Action CSRF check
//      (isCsrfOriginAllowed in action-handler.js reads only this list, NOT
//       allowedDevOrigins, so both must be set for the sign-in flow to work)
const DEV_IP_ORIGINS =
  process.env.NODE_ENV === "development"
    ? ["127.0.0.1:3000", "127.0.0.1:3001"]
    : [];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pg"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "@tanstack/react-table",
    ],
    serverActions: {
      allowedOrigins: DEV_IP_ORIGINS,
    },
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
