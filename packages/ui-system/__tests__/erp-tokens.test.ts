import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const tokens = readFileSync(
	path.join(pkgRoot, "src", "styles", "tokens.css"),
	"utf8",
);

/** ERP tokens promoted 2026-07-17 (UI-CAP-05 / user authority A). */
const promoted = [
	"surface-sunken",
	"surface-raised",
	"canvas",
	"foreground-secondary",
	"foreground-tertiary",
	"success-subtle",
	"success-subtle-foreground",
	"success-border",
	"warning-subtle",
	"warning-subtle-foreground",
	"warning-border",
	"info-subtle",
	"info-subtle-foreground",
	"info-border",
	"destructive-subtle",
	"destructive-subtle-foreground",
	"destructive-border",
	"table-row-hover",
	"table-stripe",
] as const;

const lightValues: Record<(typeof promoted)[number], string> = {
	"surface-sunken": "oklch(0.965 0 0)",
	"surface-raised": "oklch(0.995 0 0)",
	canvas: "oklch(0.94 0 0)",
	"foreground-secondary": "oklch(0.45 0 0)",
	"foreground-tertiary": "oklch(0.5 0 0)",
	"success-subtle": "oklch(0.95 0.03 160)",
	"success-subtle-foreground": "oklch(0.38 0.1 160)",
	"success-border": "oklch(0.74 0.1 160)",
	"warning-subtle": "oklch(0.96 0.04 75)",
	"warning-subtle-foreground": "oklch(0.45 0.12 75)",
	"warning-border": "oklch(0.78 0.04 75)",
	"info-subtle": "oklch(0.95 0.03 230)",
	"info-subtle-foreground": "oklch(0.38 0.1 230)",
	"info-border": "oklch(0.77 0.04 230)",
	"destructive-subtle": "oklch(0.96 0.03 25)",
	"destructive-subtle-foreground": "oklch(0.42 0.12 25)",
	"destructive-border": "oklch(0.77 0.06 25)",
	"table-row-hover": "oklch(0.955 0 0)",
	"table-stripe": "oklch(0.99 0 0)",
};

const darkValues: Record<(typeof promoted)[number], string> = {
	"surface-sunken": "oklch(0.17 0 0)",
	"surface-raised": "oklch(0.23 0 0)",
	canvas: "oklch(0.12 0 0)",
	"foreground-secondary": "oklch(0.82 0 0)",
	"foreground-tertiary": "oklch(0.78 0 0)",
	"success-subtle": "oklch(0.26 0.03 160)",
	"success-subtle-foreground": "oklch(0.85 0.08 160)",
	"success-border": "oklch(0.7 0.1 160)",
	"warning-subtle": "oklch(0.28 0.04 75)",
	"warning-subtle-foreground": "oklch(0.88 0.08 75)",
	"warning-border": "oklch(0.73 0.07 75)",
	"info-subtle": "oklch(0.26 0.03 230)",
	"info-subtle-foreground": "oklch(0.85 0.08 230)",
	"info-border": "oklch(0.72 0.05 230)",
	"destructive-subtle": "oklch(0.26 0.04 25)",
	"destructive-subtle-foreground": "oklch(0.85 0.1 25)",
	"destructive-border": "oklch(0.73 0.05 25)",
	"table-row-hover": "oklch(0.24 0 0)",
	"table-stripe": "oklch(0.19 0 0)",
};

function blockBetween(source: string, start: string, end: string): string {
	const i = source.indexOf(start);
	expect(i, `missing block start ${start}`).toBeGreaterThanOrEqual(0);
	const j = source.indexOf(end, i + start.length);
	expect(j, `missing block end ${end}`).toBeGreaterThan(i);
	return source.slice(i, j);
}

function declaration(block: string, name: string): string | null {
	const re = new RegExp(`--${name}:\\s*([^;]+);`);
	const m = block.match(re);
	return m ? m[1].trim() : null;
}

describe("@afenda/ui-system — ERP token families (UI-CAP-05)", () => {
	const themeBlock = blockBetween(tokens, "@theme inline {", "\n}");
	const rootBlock = blockBetween(tokens, ":root {", "\n.dark {");
	const darkBlock = blockBetween(tokens, ".dark {", "\n}");

	it.each(promoted)(
		"defines --%s in :root and .dark with expected values",
		(name) => {
			expect(declaration(rootBlock, name)).toBe(lightValues[name]);
			expect(declaration(darkBlock, name)).toBe(darkValues[name]);
		},
	);

	it.each(promoted)(
		"maps --color-%s to var(--%s) in @theme inline",
		(name) => {
			expect(declaration(themeBlock, `color-${name}`)).toBe(`var(--${name})`);
		},
	);

	it("does not ship removed label ladder slot --foreground-quaternary", () => {
		expect(tokens).not.toMatch(/--foreground-quaternary\b/);
		expect(tokens).not.toMatch(/--color-foreground-quaternary\b/);
	});

	it("places tertiary between secondary and muted-foreground (both modes)", () => {
		const lightSec = declaration(rootBlock, "foreground-secondary");
		const lightTer = declaration(rootBlock, "foreground-tertiary");
		const lightMuted = declaration(rootBlock, "muted-foreground");
		const darkSec = declaration(darkBlock, "foreground-secondary");
		const darkTer = declaration(darkBlock, "foreground-tertiary");
		const darkMuted = declaration(darkBlock, "muted-foreground");
		const L = (v: string | null) => {
			const m = v?.match(/oklch\(\s*([0-9.]+)/);
			expect(m, `parse L from ${v}`).toBeTruthy();
			return Number(m?.[1]);
		};
		// Light: darker L = stronger ink → secondary < tertiary < muted-foreground
		expect(L(lightSec)).toBeLessThan(L(lightTer));
		expect(L(lightTer)).toBeLessThan(L(lightMuted));
		// Dark: lighter L = stronger ink → secondary > tertiary > muted-foreground
		expect(L(darkSec)).toBeGreaterThan(L(darkTer));
		expect(L(darkTer)).toBeGreaterThan(L(darkMuted));
	});

	it("keeps shadcn registry light slots unmodified (sample + counts)", () => {
		expect(declaration(rootBlock, "background")).toBe("oklch(1 0 0)");
		expect(declaration(rootBlock, "foreground")).toBe("oklch(0.145 0 0)");
		expect(declaration(rootBlock, "muted")).toBe("oklch(0.97 0 0)");
		expect(declaration(rootBlock, "sidebar")).toBe("oklch(0.985 0 0)");
		expect(declaration(rootBlock, "radius")).toBe("0.625rem");
		const registryLight = [
			"background",
			"foreground",
			"card",
			"card-foreground",
			"popover",
			"popover-foreground",
			"primary",
			"primary-foreground",
			"secondary",
			"secondary-foreground",
			"muted",
			"muted-foreground",
			"accent",
			"accent-foreground",
			"destructive",
			"border",
			"input",
			"ring",
			"chart-1",
			"chart-2",
			"chart-3",
			"chart-4",
			"chart-5",
			"radius",
			"sidebar",
			"sidebar-foreground",
			"sidebar-primary",
			"sidebar-primary-foreground",
			"sidebar-accent",
			"sidebar-accent-foreground",
			"sidebar-border",
			"sidebar-ring",
		];
		for (const name of registryLight) {
			expect(declaration(rootBlock, name), name).toBeTruthy();
		}
		expect(registryLight).toHaveLength(32);
	});

	it("keeps shadcn registry dark slots unmodified (sample + counts)", () => {
		expect(declaration(darkBlock, "background")).toBe("oklch(0.145 0 0)");
		expect(declaration(darkBlock, "foreground")).toBe("oklch(0.985 0 0)");
		expect(declaration(darkBlock, "muted")).toBe("oklch(0.269 0 0)");
		expect(declaration(darkBlock, "destructive")).toBe(
			"oklch(0.704 0.191 22.216)",
		);
		const registryDark = [
			"background",
			"foreground",
			"card",
			"card-foreground",
			"popover",
			"popover-foreground",
			"primary",
			"primary-foreground",
			"secondary",
			"secondary-foreground",
			"muted",
			"muted-foreground",
			"accent",
			"accent-foreground",
			"destructive",
			"border",
			"input",
			"ring",
			"chart-1",
			"chart-2",
			"chart-3",
			"chart-4",
			"chart-5",
			"sidebar",
			"sidebar-foreground",
			"sidebar-primary",
			"sidebar-primary-foreground",
			"sidebar-accent",
			"sidebar-accent-foreground",
			"sidebar-border",
			"sidebar-ring",
		];
		for (const name of registryDark) {
			expect(declaration(darkBlock, name), name).toBeTruthy();
		}
		expect(registryDark).toHaveLength(31);
	});

	it("preserves radius ladder including 2xl/3xl/4xl", () => {
		expect(declaration(themeBlock, "radius-2xl")).toBe(
			"calc(var(--radius) * 1.8)",
		);
		expect(declaration(themeBlock, "radius-3xl")).toBe(
			"calc(var(--radius) * 2.2)",
		);
		expect(declaration(themeBlock, "radius-4xl")).toBe(
			"calc(var(--radius) * 2.6)",
		);
	});
});
