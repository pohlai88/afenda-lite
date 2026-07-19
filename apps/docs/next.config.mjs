/**
 * Fumadocs MDX · Next.js: docs-V2/docs/fumadocs-mdx-next.md
 * Framework Mode shell: docs-V2/docs/next.md · LLM .md rewrite: docs-V2/docs/llms.md
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createMDX } from "fumadocs-mdx/next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(appDir, "../..");

// Repo-root `.env.local` only (same posture as apps/web) — Next has no envDir knob.
// forceReload: Next may cache loadEnvConfig(apps/docs) before this file runs.
// ESM (.mjs): `@next/env` exposes loadEnvConfig on the default export.
nextEnv.loadEnvConfig(repoRoot, undefined, undefined, true);

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	async rewrites() {
		return [
			{
				source: "/docs/:path*.md",
				destination: "/llms.mdx/docs/:path*",
			},
		];
	},
};

const withMDX = createMDX();

export default withMDX(config);
