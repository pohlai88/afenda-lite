import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const tokens = readFileSync(
	path.join(packageRoot, "src", "styles", "tokens.css"),
	"utf8",
);

function blockBetween(
	source: string,
	start: string,
	end: string,
	fromIndex = 0,
): string {
	const startIndex = source.indexOf(start, fromIndex);
	// biome-ignore lint/suspicious/noMisplacedAssertion: This parser helper executes only inside test cases.
	expect(startIndex, `missing block start ${start}`).toBeGreaterThanOrEqual(0);
	const endIndex = source.indexOf(end, startIndex + start.length);
	// biome-ignore lint/suspicious/noMisplacedAssertion: This parser helper executes only inside test cases.
	expect(endIndex, `missing block end ${end}`).toBeGreaterThan(startIndex);
	return source.slice(startIndex, endIndex);
}

function declarationEntries(
	block: string,
): readonly (readonly [string, string])[] {
	return [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [
		match[1] ?? "",
		match[2]?.trim().replace(/\s+/g, " ") ?? "",
	]);
}

function declarations(block: string): ReadonlyMap<string, string> {
	return new Map(declarationEntries(block));
}

function mergeDeclarations(
	...palettes: readonly ReadonlyMap<string, string>[]
): ReadonlyMap<string, string> {
	return new Map(palettes.flatMap((palette) => [...palette]));
}

function declaration(
	palette: ReadonlyMap<string, string>,
	name: string,
): string | null {
	return palette.get(name) ?? null;
}

function oklch(value: string | null): { l: number; c: number; h: number } {
	const match = value?.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);
	// biome-ignore lint/suspicious/noMisplacedAssertion: This token parser helper executes only inside test cases.
	expect(match, `parse OKLCH from ${value}`).toBeTruthy();
	return {
		l: Number(match?.[1]),
		c: Number(match?.[2]),
		h: Number(match?.[3]),
	};
}

function oklabDistance(left: string | null, right: string | null): number {
	const first = oklch(left);
	const second = oklch(right);
	const radians = (degrees: number) => (degrees * Math.PI) / 180;
	const firstA = first.c * Math.cos(radians(first.h));
	const firstB = first.c * Math.sin(radians(first.h));
	const secondA = second.c * Math.cos(radians(second.h));
	const secondB = second.c * Math.sin(radians(second.h));
	return Math.hypot(first.l - second.l, firstA - secondA, firstB - secondB);
}

const themeBlock = blockBetween(tokens, "@theme inline {", "\n}");
const rootStart = tokens.indexOf("\n:root {");
const rootBlock = blockBetween(tokens, "\n:root {", "\n}");
const darkOverrideBlock = blockBetween(
	tokens,
	"\n.dark {",
	"\n}",
	rootStart + 1,
);
const themeDeclarations = declarations(themeBlock);
const lightPalette = declarations(rootBlock);
const darkOverrides = declarations(darkOverrideBlock);
const darkPalette = mergeDeclarations(lightPalette, darkOverrides);

const shadcnLight = {
	background: "oklch(1 0 0)",
	foreground: "oklch(0.145 0 0)",
	card: "oklch(1 0 0)",
	"card-foreground": "oklch(0.145 0 0)",
	popover: "oklch(1 0 0)",
	"popover-foreground": "oklch(0.145 0 0)",
	primary: "oklch(0.205 0 0)",
	"primary-foreground": "oklch(0.985 0 0)",
	secondary: "oklch(0.97 0 0)",
	"secondary-foreground": "oklch(0.205 0 0)",
	muted: "oklch(0.97 0 0)",
	"muted-foreground": "oklch(0.556 0 0)",
	accent: "oklch(0.97 0 0)",
	"accent-foreground": "oklch(0.205 0 0)",
	destructive: "oklch(0.577 0.245 27.325)",
	border: "oklch(0.922 0 0)",
	input: "oklch(0.922 0 0)",
	ring: "oklch(0.708 0 0)",
	"chart-1": "oklch(0.646 0.222 41.116)",
	"chart-2": "oklch(0.6 0.118 184.704)",
	"chart-3": "oklch(0.398 0.07 227.392)",
	"chart-4": "oklch(0.828 0.189 84.429)",
	"chart-5": "oklch(0.769 0.188 70.08)",
	sidebar: "oklch(0.985 0 0)",
	"sidebar-foreground": "oklch(0.145 0 0)",
	"sidebar-primary": "oklch(0.205 0 0)",
	"sidebar-primary-foreground": "oklch(0.985 0 0)",
	"sidebar-accent": "oklch(0.97 0 0)",
	"sidebar-accent-foreground": "oklch(0.205 0 0)",
	"sidebar-border": "oklch(0.922 0 0)",
	"sidebar-ring": "oklch(0.708 0 0)",
} as const;

const shadcnDark = {
	background: "oklch(0.145 0 0)",
	foreground: "oklch(0.985 0 0)",
	card: "oklch(0.205 0 0)",
	"card-foreground": "oklch(0.985 0 0)",
	popover: "oklch(0.205 0 0)",
	"popover-foreground": "oklch(0.985 0 0)",
	primary: "oklch(0.922 0 0)",
	"primary-foreground": "oklch(0.205 0 0)",
	secondary: "oklch(0.269 0 0)",
	"secondary-foreground": "oklch(0.985 0 0)",
	muted: "oklch(0.269 0 0)",
	"muted-foreground": "oklch(0.708 0 0)",
	accent: "oklch(0.269 0 0)",
	"accent-foreground": "oklch(0.985 0 0)",
	destructive: "oklch(0.704 0.191 22.216)",
	border: "oklch(1 0 0 / 10%)",
	input: "oklch(1 0 0 / 15%)",
	ring: "oklch(0.556 0 0)",
	"chart-1": "oklch(0.488 0.243 264.376)",
	"chart-2": "oklch(0.696 0.17 162.48)",
	"chart-3": "oklch(0.769 0.188 70.08)",
	"chart-4": "oklch(0.627 0.265 303.9)",
	"chart-5": "oklch(0.645 0.246 16.439)",
	sidebar: "oklch(0.205 0 0)",
	"sidebar-foreground": "oklch(0.985 0 0)",
	"sidebar-primary": "oklch(0.488 0.243 264.376)",
	"sidebar-primary-foreground": "oklch(0.985 0 0)",
	"sidebar-accent": "oklch(0.269 0 0)",
	"sidebar-accent-foreground": "oklch(0.985 0 0)",
	"sidebar-border": "oklch(1 0 0 / 10%)",
	"sidebar-ring": "oklch(0.556 0 0)",
} as const;

const erpLight = {
	canvas: "oklch(0.985 0 0)",
	"surface-sunken": "oklch(0.97 0 0)",
	"surface-raised": "oklch(1 0 0)",
	"surface-overlay": "oklch(1 0 0)",
	"foreground-secondary": "oklch(0.32 0 0)",
	"foreground-tertiary": "oklch(0.45 0 0)",
	"foreground-disabled": "oklch(0.708 0 0)",
	"data-series-1": "oklch(0.646 0.222 41.116)",
	"data-series-2": "oklch(0.6 0.118 184.704)",
	"data-series-3": "oklch(0.398 0.07 227.392)",
	"data-series-4": "oklch(0.828 0.189 84.429)",
	"data-series-5": "oklch(0.56 0.22 292)",
	success: "oklch(0.527 0.154 150.069)",
	"success-foreground": "oklch(0.985 0 0)",
	"success-subtle": "oklch(1 0 0)",
	"success-subtle-foreground": "oklch(0.145 0 0)",
	"success-border": "oklch(0.792 0.142 152.535)",
	warning: "oklch(0.76 0.12 80)",
	"warning-foreground": "oklch(0.205 0 0)",
	"warning-subtle": "oklch(1 0 0)",
	"warning-subtle-foreground": "oklch(0.145 0 0)",
	"warning-border": "oklch(0.828 0.189 84.429)",
	info: "oklch(0.546 0.245 262.881)",
	"info-foreground": "oklch(0.985 0 0)",
	"info-subtle": "oklch(1 0 0)",
	"info-subtle-foreground": "oklch(0.145 0 0)",
	"info-border": "oklch(0.809 0.105 251.813)",
	"destructive-foreground": "oklch(0.985 0 0)",
	"destructive-subtle": "oklch(1 0 0)",
	"destructive-subtle-foreground": "oklch(0.145 0 0)",
	"destructive-border": "oklch(0.808 0.114 19.571)",
	"neutral-subtle": "var(--muted)",
	"neutral-subtle-foreground": "var(--muted-foreground)",
	"neutral-border": "var(--border)",
	"primary-hover": "oklch(0.269 0 0)",
	"primary-subtle": "oklch(0.97 0 0)",
	"primary-track": "oklch(0.922 0 0)",
	"secondary-hover": "oklch(0.922 0 0)",
	"accent-hover": "oklch(0.922 0 0)",
	"accent-fill-hover": "var(--accent-hover)",
	"destructive-hover": "oklch(0.505 0.213 27.518)",
	"destructive-soft": "var(--destructive)",
	"control-fill": "oklch(1 0 0)",
	"control-fill-hover": "oklch(0.985 0 0)",
	"control-fill-strong": "oklch(0.97 0 0)",
	"control-disabled": "oklch(0.97 0 0)",
	selection: "oklch(0.951 0.026 236.824)",
	"selection-foreground": "oklch(0.205 0 0)",
	"ring-focus": "oklch(0.48 0 0)",
	"ring-destructive": "oklch(0.577 0.245 27.325 / 35%)",
	"ring-destructive-focus": "oklch(0.577 0.245 27.325 / 20%)",
	"ring-destructive-focus-strong": "oklch(0.577 0.245 27.325 / 40%)",
	"kbd-tooltip-fill": "oklch(1 0 0 / 20%)",
	"table-header": "oklch(0.97 0 0)",
	"table-row-hover": "oklch(0.985 0 0)",
	"table-row-selected": "oklch(0.951 0.026 236.824)",
	"table-stripe": "oklch(0.992 0 0)",
	"total-row": "oklch(0.97 0 0)",
	"overlay-scrim": "oklch(0.145 0 0 / 45%)",
	skeleton: "oklch(0.922 0 0)",
	"sidebar-muted-foreground": "var(--muted-foreground)",
} as const;

const erpDark = {
	canvas: "oklch(0.12 0 0)",
	"surface-sunken": "oklch(0.13 0 0)",
	"surface-raised": "oklch(0.205 0 0)",
	"surface-overlay": "oklch(0.235 0 0)",
	"foreground-secondary": "oklch(0.9 0 0)",
	"foreground-tertiary": "oklch(0.85 0 0)",
	"foreground-disabled": "oklch(0.556 0 0)",
	"data-series-1": "oklch(0.72 0.18 41.116)",
	"data-series-2": "oklch(0.75 0.15 170)",
	"data-series-3": "oklch(0.68 0.18 240)",
	"data-series-4": "oklch(0.86 0.15 84.429)",
	"data-series-5": "oklch(0.627 0.265 303.9)",
	success: "oklch(0.75 0.12 155)",
	"success-foreground": "oklch(0.145 0 0)",
	"success-subtle": "oklch(0.205 0 0)",
	"success-subtle-foreground": "oklch(1 0 0)",
	"success-border": "oklch(0.68 0.08 155)",
	warning: "oklch(0.76 0.12 80)",
	"warning-foreground": "oklch(0.205 0 0)",
	"warning-subtle": "oklch(0.205 0 0)",
	"warning-subtle-foreground": "oklch(1 0 0)",
	"warning-border": "oklch(0.68 0.08 80)",
	info: "oklch(0.75 0.12 245)",
	"info-foreground": "oklch(0.145 0 0)",
	"info-subtle": "oklch(0.205 0 0)",
	"info-subtle-foreground": "oklch(1 0 0)",
	"info-border": "oklch(0.68 0.08 245)",
	"destructive-foreground": "oklch(0.985 0 0)",
	"destructive-subtle": "oklch(0.205 0 0)",
	"destructive-subtle-foreground": "oklch(1 0 0)",
	"destructive-border": "oklch(0.68 0.08 25)",
	"neutral-subtle": "var(--muted)",
	"neutral-subtle-foreground": "var(--muted-foreground)",
	"neutral-border": "var(--border)",
	"primary-hover": "oklch(0.87 0 0)",
	"primary-subtle": "oklch(0.269 0 0)",
	"primary-track": "oklch(0.32 0 0)",
	"secondary-hover": "oklch(0.32 0 0)",
	"accent-hover": "oklch(0.32 0 0)",
	"accent-fill-hover": "var(--accent-hover)",
	"destructive-hover": "oklch(0.637 0.237 25.331)",
	"destructive-soft": "oklch(0.497 0.12 25)",
	"control-fill": "oklch(0.205 0 0)",
	"control-fill-hover": "oklch(0.235 0 0)",
	"control-fill-strong": "oklch(0.269 0 0)",
	"control-disabled": "oklch(0.205 0 0)",
	selection: "oklch(0.282 0.091 267.935)",
	"selection-foreground": "oklch(0.985 0 0)",
	"ring-focus": "oklch(0.72 0 0)",
	"ring-destructive": "oklch(0.704 0.191 22.216 / 45%)",
	"ring-destructive-focus": "oklch(0.704 0.191 22.216 / 20%)",
	"ring-destructive-focus-strong": "oklch(0.704 0.191 22.216 / 40%)",
	"kbd-tooltip-fill": "oklch(1 0 0 / 10%)",
	"table-header": "oklch(0.205 0 0)",
	"table-row-hover": "oklch(0.235 0 0)",
	"table-row-selected": "oklch(0.282 0.091 267.935)",
	"table-stripe": "oklch(0.175 0 0)",
	"total-row": "oklch(0.269 0 0)",
	"overlay-scrim": "oklch(0 0 0 / 60%)",
	skeleton: "oklch(0.269 0 0)",
	"sidebar-muted-foreground": "var(--muted-foreground)",
} as const;

describe("@afenda/ui-system token contract", () => {
	it.each([
		["light", lightPalette, shadcnLight],
		["dark", darkPalette, shadcnDark],
	] as const)("keeps exact shadcn neutral defaults in %s mode", (_mode, palette, expected) => {
		for (const [name, value] of Object.entries(expected)) {
			expect(declaration(palette, name), name).toBe(value);
		}
	});

	it.each([
		["light", lightPalette, erpLight],
		["dark", darkPalette, erpDark],
	] as const)("keeps exact ERP additive tokens in %s mode", (_mode, palette, expected) => {
		for (const [name, value] of Object.entries(expected)) {
			expect(declaration(palette, name), name).toBe(value);
		}
	});

	it("declares each custom property once within its ownership block", () => {
		for (const [name, block] of [
			["theme", themeBlock],
			["root", rootBlock],
			["dark", darkOverrideBlock],
		] as const) {
			const names = declarationEntries(block).map(([token]) => token);
			const duplicates = names.filter(
				(token, index) => names.indexOf(token) !== index,
			);
			expect(duplicates, `${name} duplicate declarations`).toEqual([]);
		}
	});

	it("maps every color token to a Tailwind v4 utility", () => {
		const colorTokens = [
			...Object.keys(shadcnLight),
			...Object.keys(erpLight),
		].filter((name) => name !== "radius");

		for (const tokenName of colorTokens) {
			expect(
				declaration(themeDeclarations, `color-${tokenName}`),
				tokenName,
			).toBe(`var(--${tokenName})`);
		}
	});

	it("preserves the shadcn radius ladder and ERP density", () => {
		expect(declaration(lightPalette, "radius")).toBe("0.625rem");
		expect(declaration(themeDeclarations, "radius-sm")).toBe(
			"calc(var(--radius) * 0.6)",
		);
		expect(declaration(themeDeclarations, "radius-md")).toBe(
			"calc(var(--radius) * 0.8)",
		);
		expect(declaration(themeDeclarations, "radius-lg")).toBe("var(--radius)");
		expect(declaration(themeDeclarations, "radius-xl")).toBe(
			"calc(var(--radius) * 1.4)",
		);
		expect(declaration(themeDeclarations, "radius-4xl")).toBe(
			"calc(var(--radius) * 2.6)",
		);
		expect(declaration(lightPalette, "control-height")).toBe("2.25rem");
		expect(declaration(darkPalette, "control-height")).toBe("2.25rem");
		expect(declaration(lightPalette, "table-row-height")).toBe("2.75rem");
	});

	it.each([
		["light", lightPalette],
		["dark", darkPalette],
	] as const)("keeps ERP %s data series perceptually separated", (_mode, palette) => {
		const series = [1, 2, 3, 4, 5].map((index) =>
			declaration(palette, `data-series-${index}`),
		);

		for (let left = 0; left < series.length; left += 1) {
			for (let right = left + 1; right < series.length; right += 1) {
				const distance = oklabDistance(
					series[left] ?? null,
					series[right] ?? null,
				);
				expect(
					distance,
					`data-series-${left + 1}/data-series-${right + 1}`,
				).toBeGreaterThanOrEqual(0.18);
			}
		}
	});

	it("keeps ERP surface roles low-chroma and ordered for each mode", () => {
		const lightSurfaces = [
			"surface-sunken",
			"canvas",
			"background",
			"card",
			"surface-raised",
			"surface-overlay",
		] as const;
		const darkSurfaces = [
			"canvas",
			"surface-sunken",
			"background",
			"card",
			"surface-raised",
			"surface-overlay",
		] as const;

		for (const [palette, surfaces] of [
			[lightPalette, lightSurfaces],
			[darkPalette, darkSurfaces],
		] as const) {
			const values = surfaces.map((name) => oklch(declaration(palette, name)));
			for (let index = 1; index < values.length; index += 1) {
				expect(values[index]?.l).toBeGreaterThanOrEqual(
					values[index - 1]?.l ?? 0,
				);
			}
			for (const value of values) {
				expect(value.c).toBeLessThanOrEqual(0.016);
			}
		}
	});

	it("uses mode-appropriate primary and destructive hover movement", () => {
		expect(oklch(declaration(lightPalette, "primary-hover")).l).toBeGreaterThan(
			oklch(declaration(lightPalette, "primary")).l,
		);
		expect(oklch(declaration(darkPalette, "primary-hover")).l).toBeLessThan(
			oklch(declaration(darkPalette, "primary")).l,
		);
		expect(
			oklch(declaration(lightPalette, "destructive-hover")).l,
		).toBeLessThan(oklch(declaration(lightPalette, "destructive")).l);
		expect(oklch(declaration(darkPalette, "destructive-hover")).l).toBeLessThan(
			oklch(declaration(darkPalette, "destructive")).l,
		);
	});

	it("locks the three semantic shadow recipes", () => {
		expect(declaration(lightPalette, "shadow-raised")).toBe(
			"0 1px 2px oklch(0.145 0 0 / 5%), 0 8px 24px -16px oklch(0.145 0 0 / 18%)",
		);
		expect(declaration(lightPalette, "shadow-overlay")).toBe(
			"0 4px 12px oklch(0.145 0 0 / 8%), 0 20px 48px -20px oklch(0.145 0 0 / 24%)",
		);
		expect(declaration(lightPalette, "shadow-dialog")).toBe(
			"0 8px 24px -12px oklch(0.145 0 0 / 14%), 0 32px 80px -24px oklch(0.145 0 0 / 30%)",
		);
		expect(declaration(darkPalette, "shadow-raised")).toBe(
			"0 1px 2px oklch(0 0 0 / 24%), 0 12px 32px -22px oklch(0 0 0 / 34%)",
		);
		expect(declaration(darkPalette, "shadow-overlay")).toBe(
			"0 4px 12px oklch(0 0 0 / 30%), 0 22px 56px -22px oklch(0 0 0 / 44%)",
		);
		expect(declaration(darkPalette, "shadow-dialog")).toBe(
			"0 10px 28px -14px oklch(0 0 0 / 38%), 0 36px 96px -28px oklch(0 0 0 / 56%)",
		);
	});

	it("does not restore a fourth text role", () => {
		expect(tokens).not.toMatch(/--foreground-quaternary\b/);
		expect(tokens).not.toMatch(/--color-foreground-quaternary\b/);
	});
});
