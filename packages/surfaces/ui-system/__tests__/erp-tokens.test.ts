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

function blockBetween(source: string, start: string, end: string): string {
	const startIndex = source.indexOf(start);
	expect(startIndex, `missing block start ${start}`).toBeGreaterThanOrEqual(0);
	const endIndex = source.indexOf(end, startIndex + start.length);
	expect(endIndex, `missing block end ${end}`).toBeGreaterThan(startIndex);
	return source.slice(startIndex, endIndex);
}

function declaration(block: string, name: string): string | null {
	const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
	return match?.[1]?.trim().replace(/\s+/g, " ") ?? null;
}

function oklch(value: string | null): { l: number; c: number; h: number } {
	const match = value?.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);
	expect(match, `parse OKLCH from ${value}`).toBeTruthy();
	return {
		l: Number(match?.[1]),
		c: Number(match?.[2]),
		h: Number(match?.[3]),
	};
}

const themeBlock = blockBetween(tokens, "@theme inline {", "\n}");
const lightBlock = blockBetween(tokens, ":root {", "\n.dark {");
const darkBlock = blockBetween(tokens, ".dark {", "\n}");

const expectedLight = {
	canvas: "oklch(0.962 0.01 255)",
	"surface-sunken": "oklch(0.97 0.008 255)",
	background: "oklch(0.978 0.006 255)",
	card: "oklch(0.99 0.004 255)",
	"surface-raised": "oklch(0.995 0.003 255)",
	popover: "oklch(0.998 0.002 255)",
	foreground: "oklch(0.245 0.018 255)",
	"foreground-secondary": "oklch(0.32 0.018 255)",
	"foreground-tertiary": "oklch(0.38 0.016 255)",
	"muted-foreground": "oklch(0.44 0.014 255)",
	primary: "oklch(0.42 0.09 255)",
	"primary-hover": "oklch(0.37 0.095 255)",
	"primary-foreground": "oklch(0.985 0.004 255)",
	"primary-subtle": "oklch(0.94 0.02 255)",
	"primary-track": "oklch(0.875 0.035 255)",
	secondary: "oklch(0.94 0.012 255)",
	"secondary-hover": "oklch(0.915 0.016 255)",
	muted: "oklch(0.95 0.008 255)",
	accent: "oklch(0.925 0.028 255)",
	"accent-fill-hover": "oklch(0.9 0.035 255)",
	border: "oklch(0.9 0.008 255)",
	input: "oklch(0.875 0.01 255)",
	ring: "oklch(0.48 0.1 255)",
	"control-fill": "oklch(0.965 0.007 255)",
	"control-fill-hover": "oklch(0.95 0.01 255)",
	"control-fill-strong": "oklch(0.925 0.015 255)",
	"table-row-hover": "oklch(0.955 0.01 255)",
	"table-stripe": "oklch(0.985 0.004 255)",
	"overlay-scrim": "oklch(0.16 0.018 255 / 45%)",
} as const;

const expectedDark = {
	canvas: "oklch(0.12 0.012 255)",
	"surface-sunken": "oklch(0.135 0.014 255)",
	background: "oklch(0.155 0.014 255)",
	card: "oklch(0.19 0.015 255)",
	"surface-raised": "oklch(0.215 0.016 255)",
	popover: "oklch(0.225 0.016 255)",
	foreground: "oklch(0.925 0.008 255)",
	"foreground-secondary": "oklch(0.9 0.01 255)",
	"foreground-tertiary": "oklch(0.88 0.01 255)",
	"muted-foreground": "oklch(0.86 0.012 255)",
	primary: "oklch(0.76 0.095 250)",
	"primary-hover": "oklch(0.8 0.09 250)",
	"primary-foreground": "oklch(0.13 0.022 255)",
	"primary-subtle": "oklch(0.235 0.03 255)",
	"primary-track": "oklch(0.34 0.04 255)",
	secondary: "oklch(0.25 0.02 255)",
	"secondary-hover": "oklch(0.285 0.024 255)",
	muted: "oklch(0.235 0.018 255)",
	accent: "oklch(0.27 0.035 255)",
	"accent-fill-hover": "oklch(0.305 0.04 255)",
	border: "oklch(0.9 0.006 255 / 14%)",
	input: "oklch(0.9 0.006 255 / 18%)",
	ring: "oklch(0.7 0.1 250)",
	"control-fill": "oklch(0.175 0.015 255)",
	"control-fill-hover": "oklch(0.21 0.02 255)",
	"control-fill-strong": "oklch(0.27 0.025 255)",
	"table-row-hover": "oklch(0.225 0.02 255)",
	"table-stripe": "oklch(0.175 0.014 255)",
	"overlay-scrim": "oklch(0 0 0 / 60%)",
} as const;

const aliases = {
	"card-foreground": "var(--foreground)",
	"popover-foreground": "var(--foreground)",
	"secondary-foreground": "var(--foreground)",
	"accent-foreground": "var(--foreground)",
	sidebar: "var(--canvas)",
	"sidebar-foreground": "var(--foreground)",
	"sidebar-primary": "var(--primary)",
	"sidebar-primary-foreground": "var(--primary-foreground)",
	"sidebar-accent": "var(--secondary)",
	"sidebar-accent-foreground": "var(--foreground)",
	"sidebar-border": "var(--border)",
	"sidebar-ring": "var(--ring-focus)",
	"sidebar-muted-foreground": "var(--muted-foreground)",
	"ring-focus": "var(--ring)",
} as const;

const statusHues = {
	success: 155,
	warning: 80,
	info: 245,
	destructive: 25,
} as const;

describe("@afenda/ui-system — Mineral Calm token contract", () => {
	it.each([
		["light", lightBlock, expectedLight],
		["dark", darkBlock, expectedDark],
	] as const)("locks the exact %s foundation fixtures", (_mode, block, expected) => {
		for (const [name, value] of Object.entries(expected)) {
			expect(declaration(block, name), name).toBe(value);
		}
	});

	it.each([
		["light", lightBlock],
		["dark", darkBlock],
	] as const)("keeps %s aliases synchronized", (_mode, block) => {
		for (const [name, value] of Object.entries(aliases)) {
			expect(declaration(block, name), name).toBe(value);
		}
	});

	it("keeps the surface hierarchy monotonic and low-chroma", () => {
		const surfaces = [
			"canvas",
			"surface-sunken",
			"background",
			"card",
			"surface-raised",
			"popover",
		] as const;
		for (const block of [lightBlock, darkBlock]) {
			const values = surfaces.map((name) => oklch(declaration(block, name)));
			for (let index = 1; index < values.length; index += 1) {
				expect(values[index]?.l).toBeGreaterThan(values[index - 1]?.l ?? 0);
			}
			for (const value of values) expect(value.c).toBeLessThanOrEqual(0.016);
		}
	});

	it("locks status hue families and accessible solid pairs in both modes", () => {
		for (const block of [lightBlock, darkBlock]) {
			for (const [role, hue] of Object.entries(statusHues)) {
				for (const suffix of ["", "-subtle", "-subtle-foreground", "-border"]) {
					expect(oklch(declaration(block, `${role}${suffix}`)).h).toBe(hue);
				}
			}
			expect(declaration(block, "success")).toBe("oklch(0.52 0.12 155)");
			expect(declaration(block, "warning")).toBe("oklch(0.76 0.12 80)");
			expect(declaration(block, "warning-foreground")).toBe(
				"oklch(0.2 0.025 80)",
			);
			expect(declaration(block, "info")).toBe("oklch(0.53 0.11 245)");
			expect(declaration(block, "destructive")).toBe("oklch(0.55 0.18 25)");
		}
	});

	it("moves primary hover darker in light mode and lighter in dark mode", () => {
		expect(oklch(declaration(lightBlock, "primary-hover")).l).toBeLessThan(
			oklch(declaration(lightBlock, "primary")).l,
		);
		expect(oklch(declaration(darkBlock, "primary-hover")).l).toBeGreaterThan(
			oklch(declaration(darkBlock, "primary")).l,
		);
	});

	it("preserves the approved radius ladder and ERP density", () => {
		expect(declaration(lightBlock, "radius")).toBe("0.625rem");
		expect(declaration(themeBlock, "radius-sm")).toBe(
			"calc(var(--radius) - 4px)",
		);
		expect(declaration(themeBlock, "radius-md")).toBe(
			"calc(var(--radius) - 2px)",
		);
		expect(declaration(themeBlock, "radius-lg")).toBe("var(--radius)");
		expect(declaration(themeBlock, "radius-xl")).toBe(
			"calc(var(--radius) + 4px)",
		);
		expect(declaration(lightBlock, "control-height")).toBe("2.25rem");
		expect(declaration(darkBlock, "control-height")).toBe("2.25rem");
	});

	it("locks the three semantic shadow recipes", () => {
		expect(declaration(lightBlock, "shadow-raised")).toBe(
			"0 1px 2px oklch(0.2 0.02 255 / 5%), 0 10px 28px -22px oklch(0.2 0.02 255 / 16%)",
		);
		expect(declaration(lightBlock, "shadow-overlay")).toBe(
			"0 2px 8px oklch(0.16 0.02 255 / 7%), 0 18px 48px -20px oklch(0.16 0.02 255 / 24%)",
		);
		expect(declaration(lightBlock, "shadow-dialog")).toBe(
			"0 8px 24px -12px oklch(0.12 0.02 255 / 14%), 0 32px 88px -28px oklch(0.12 0.02 255 / 32%)",
		);
		expect(declaration(darkBlock, "shadow-raised")).toContain(
			"0 12px 32px -22px oklch(0 0 0 / 34%)",
		);
		expect(declaration(darkBlock, "shadow-overlay")).toContain(
			"0 22px 56px -22px oklch(0 0 0 / 44%)",
		);
		expect(declaration(darkBlock, "shadow-dialog")).toContain(
			"0 36px 96px -28px oklch(0 0 0 / 56%)",
		);
	});

	it("keeps categorical chart colors unchanged", () => {
		const lightCharts = [
			"oklch(0.646 0.222 41.116)",
			"oklch(0.6 0.118 184.704)",
			"oklch(0.398 0.07 227.392)",
			"oklch(0.828 0.189 84.429)",
			"oklch(0.769 0.188 70.08)",
		];
		const darkCharts = [
			"oklch(0.488 0.243 264.376)",
			"oklch(0.696 0.17 162.48)",
			"oklch(0.769 0.188 70.08)",
			"oklch(0.627 0.265 303.9)",
			"oklch(0.645 0.246 16.439)",
		];
		for (let index = 1; index <= 5; index += 1) {
			expect(declaration(lightBlock, `chart-${index}`)).toBe(
				lightCharts[index - 1],
			);
			expect(declaration(darkBlock, `chart-${index}`)).toBe(
				darkCharts[index - 1],
			);
		}
	});

	it("does not restore a fourth text role", () => {
		expect(tokens).not.toMatch(/--foreground-quaternary\b/);
		expect(tokens).not.toMatch(/--color-foreground-quaternary\b/);
	});
});
