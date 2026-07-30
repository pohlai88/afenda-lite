/**
 * Slice 3.8 Test 9 — prohibit direct domain outbox publishing outside allowed paths.
 * Adapters may call ports.outbox.append until registry-gated cutover completes.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const srcRoot = path.join(packageRoot, "src");

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo"]);

const FORBIDDEN_SYMBOLS = ["publishOutboxEvent", "insertOutboxEvent"] as const;

const PORTS_OUTBOX_APPEND_ALLOWLIST = new Set([
	"emissions/mutation-outcome.ts",
	"emissions/sql-side-effects.ts",
	"production-ports.ts",
]);

function collectSourceFiles(dir: string): string[] {
	if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
		return [];
	}
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) {
			continue;
		}
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			files.push(...collectSourceFiles(fullPath));
			continue;
		}
		if (/\.ts$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function toSrcRelative(file: string): string {
	return path.relative(srcRoot, file).replace(/\\/g, "/");
}

function isAllowedOutboxAppendPath(relative: string): boolean {
	if (PORTS_OUTBOX_APPEND_ALLOWLIST.has(relative)) {
		return true;
	}
	return relative.startsWith("adapters/");
}

function findOutboxBoundaryViolations(): string[] {
	const violations: string[] = [];

	for (const file of collectSourceFiles(srcRoot)) {
		const relative = toSrcRelative(file);
		const source = readFileSync(file, "utf8");

		for (const symbol of FORBIDDEN_SYMBOLS) {
			if (source.includes(symbol)) {
				violations.push(`${relative} -> forbidden symbol ${symbol}`);
			}
		}

		if (
			source.includes("ports.outbox.append") &&
			!isAllowedOutboxAppendPath(relative)
		) {
			violations.push(`${relative} -> ports.outbox.append outside allowlist`);
		}
	}

	return violations.toSorted((left, right) => left.localeCompare(right));
}

describe("Slice 3.8 — no direct domain outbox emission", () => {
	it("does not allow direct domain outbox publishing outside allowed emission paths", () => {
		expect(findOutboxBoundaryViolations()).toEqual([]);
	});
});
