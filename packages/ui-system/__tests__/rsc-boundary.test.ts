import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const read = (rel: string) => readFileSync(path.join(pkgRoot, rel), "utf8");

const hasUseClient = (src: string) =>
	/^["']use client["'];?\s*$/m.test(src.trimStart());

/**
 * Primitives generated without a client boundary (safe for Server Component trees
 * that only compose these leaves — interactive overlays still need client parents).
 */
const SERVER_SAFE = [
	"alert",
	"badge",
	"breadcrumb",
	"button",
	"card",
	"input",
	"pagination",
	"skeleton",
	"textarea",
] as const;

/** All other vendored primitives in this package declare use client. */
const CLIENT_REQUIRED = [
	"avatar",
	"checkbox",
	"command",
	"dialog",
	"dropdown-menu",
	"field",
	"label",
	"popover",
	"radio-group",
	"select",
	"separator",
	"sheet",
	"sidebar",
	"sonner",
	"switch",
	"table",
	"tabs",
	"tooltip",
] as const;

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

	it("interactive primitives declare use client", () => {
		const offenders: string[] = [];
		for (const name of CLIENT_REQUIRED) {
			const rel = `src/components/ui/${name}.tsx`;
			if (!hasUseClient(read(rel))) {
				offenders.push(rel);
			}
		}
		expect(offenders, `missing use client: ${offenders}`).toEqual([]);
	});
});
