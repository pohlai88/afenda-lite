/**
 * Shared product-TSX scan helpers for compose red-flag / suitability gates.
 * Auth island allowlist must stay aligned with afenda-elite-ui-compose/reference.md.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Staging DNA is not Living product UI (ARCH-015 · ADR-010). */
const SKIP_DIRS = new Set([
	"node_modules",
	".next",
	".turbo",
	"__tests__",
	"shadcn-studio",
]);

/** Relative POSIX-ish paths under apps/web that are Neon Auth island. */
export const AUTH_ISLAND_PREFIXES = [
	"app/(public)/auth/",
	"app/(public)/join/layout.tsx",
	"app/(public)/join/loading.tsx",
	"app/(public)/join/error.tsx",
	"features/auth/auth-surface-chrome.tsx",
	"features/auth/auth-surface-root.tsx",
	"features/auth/auth-path-shell.tsx",
	"features/auth/join-shell.tsx",
];

export function webAppRoot(): string {
	return webRoot;
}

export function toRel(fullPath: string): string {
	return path.relative(webRoot, fullPath).split(path.sep).join("/");
}

export function isAuthIsland(rel: string): boolean {
	return AUTH_ISLAND_PREFIXES.some(
		(prefix) => rel === prefix || rel.startsWith(prefix),
	);
}

function collectTsx(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) {
			continue;
		}
		const fullPath = path.join(dir, entry);
		if (statSync(fullPath).isDirectory()) {
			files.push(...collectTsx(fullPath));
		} else if (/\.tsx$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function isDnaStaging(rel: string): boolean {
	return (
		rel === "shadcn-studio" ||
		rel.startsWith("shadcn-studio/") ||
		rel === "components/shadcn-studio" ||
		rel.startsWith("components/shadcn-studio/")
	);
}

export function productTsx(): { rel: string; src: string }[] {
	return collectTsx(webRoot)
		.map((full) => ({ rel: toRel(full), src: readFileSync(full, "utf8") }))
		.filter(({ rel }) => !isAuthIsland(rel) && !isDnaStaging(rel));
}
