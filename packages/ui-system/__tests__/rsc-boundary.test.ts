import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const uiDir = path.join(pkgRoot, "src", "components", "ui");

const read = (rel: string) => readFileSync(path.join(pkgRoot, rel), "utf8");

const hasUseClient = (src: string) =>
	/^["']use client["'];?\s*$/m.test(src.trimStart());

/**
 * Primitives without a client boundary (safe for Server Component trees that
 * only compose these leaves — interactive overlays still need client parents).
 * Keep this list explicit: every other `components/ui/*.tsx` must declare
 * `"use client"`.
 */
const SERVER_SAFE = [
	"alert",
	"badge",
	"breadcrumb",
	"button",
	"button-group",
	"card",
	"input",
	"kbd",
	"native-select",
	"pagination",
	"skeleton",
	"textarea",
] as const;

const uiPrimitives = readdirSync(uiDir)
	.filter((f) => f.endsWith(".tsx"))
	.map((f) => f.replace(/\.tsx$/, ""))
	.sort();

describe("@afenda/ui-system — RSC boundary discipline", () => {
	it("keeps the flat barrel free of a client directive", () => {
		expect(hasUseClient(read("src/index.ts"))).toBe(false);
	});

	it("server-safe primitives omit use client", () => {
		const offenders: string[] = [];
		for (const name of SERVER_SAFE) {
			const rel = `src/components/ui/${name}.tsx`;
			if (hasUseClient(read(rel))) {
				offenders.push(rel);
			}
		}
		expect(offenders, `unexpected use client: ${offenders}`).toEqual([]);
	});

	it("every non-server-safe primitive declares use client", () => {
		const serverSafe = new Set<string>(SERVER_SAFE);
		const offenders: string[] = [];
		for (const name of uiPrimitives) {
			if (serverSafe.has(name)) {
				continue;
			}
			const rel = `src/components/ui/${name}.tsx`;
			if (!hasUseClient(read(rel))) {
				offenders.push(rel);
			}
		}
		expect(offenders, `missing use client: ${offenders}`).toEqual([]);
	});

	it("SERVER_SAFE only names primitives that exist on disk", () => {
		const onDisk = new Set(uiPrimitives);
		const missing = SERVER_SAFE.filter((name) => !onDisk.has(name));
		expect(missing, `SERVER_SAFE ghosts: ${missing}`).toEqual([]);
	});
});
