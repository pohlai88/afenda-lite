import path from "node:path";
import { fileURLToPath } from "node:url";
import { securityHeadersForNext } from "@afenda/security";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(appDir, "../..");

// ARCH-027: local runtime env lives at repo-root `.env.local` only.
// Next 16 has no envDir knob — load from monorepo root before config evaluates.
// forceReload: Next caches loadEnvConfig(apps/web) before this file runs; without
// the 4th arg the root dir is ignored (vercel/next.js#92040).
loadEnvConfig(repoRoot, undefined, undefined, true);

const securityHeaders = securityHeadersForNext();

// When the dev server is accessed via explicit IP (127.0.0.1) rather than the
// hostname it binds to (localhost), Next.js sets x-forwarded-host to localhost
// while the browser sends Origin: http://127.0.0.1:PORT. The two layers that
// need the same exception are distinct:
//   1. allowedDevOrigins  — Turbopack HMR WebSocket connections
//   2. experimental.serverActions.allowedOrigins — Server Action CSRF check
const DEV_IP_ORIGINS =
	process.env.NODE_ENV === "development"
		? ["127.0.0.1:3000", "127.0.0.1:3001"]
		: [];

const nextConfig: NextConfig = {
	// Monorepo: trace + Turbopack root include packages/* outside apps/web.
	outputFileTracingRoot: repoRoot,
	reactCompiler: true,
	poweredByHeader: false,
	allowedDevOrigins: ["127.0.0.1"],
	transpilePackages: [
		"@afenda/auth",
		"@afenda/db",
		"@afenda/env",
		"@afenda/http",
		"@afenda/security",
		"@afenda/ui-system",
	],
	serverExternalPackages: ["@neondatabase/serverless"],
	experimental: {
		optimizePackageImports: [
			"lucide-react",
			"@afenda/ui-system",
			"@neondatabase/auth-ui",
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
			{
				protocol: "https",
				hostname: "cdn.shadcnstudio.com",
			},
		],
	},
	async redirects() {
		// Path SSOT: packages/auth/src/auth-paths · packages/auth/src/join-paths.
		// next.config.ts is CJS-transpiled; relative `.ts` imports fail MODULE_NOT_FOUND.
		// Values are pinned by auth-paths.inventory.test.ts — do not diverge.
		const AUTH_ACCEPT_INVITATION_PATH = "/auth/accept-invitation";
		const JOIN_PATH = "/join";
		return [
			{
				source: AUTH_ACCEPT_INVITATION_PATH,
				has: [
					{
						type: "query",
						key: "invitationId",
						value: "(?<invitationId>.+)",
					},
				],
				destination: `${JOIN_PATH}?invitationId=:invitationId`,
				permanent: true,
			},
			{
				source: AUTH_ACCEPT_INVITATION_PATH,
				destination: JOIN_PATH,
				permanent: true,
			},
		];
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
