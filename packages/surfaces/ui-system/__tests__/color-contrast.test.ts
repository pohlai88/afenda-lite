import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APCAcontrast, fontLookupAPCA, sRGBtoY } from "apca-w3";
import { converter, parse } from "culori";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const repoRoot = path.resolve(packageRoot, "..", "..", "..");
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

function declarations(block: string): ReadonlyMap<string, string> {
	return new Map(
		[...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [
			match[1],
			match[2].trim(),
		]),
	);
}

const modes = {
	light: declarations(blockBetween(tokens, ":root {", "\n.dark {")),
	dark: declarations(blockBetween(tokens, ".dark {", "\n}")),
} as const;

const toRgb = converter("rgb");

function rgbChannels(value: string): readonly [number, number, number] {
	const parsed = parse(value);
	const rgb = parsed ? toRgb(parsed) : undefined;
	expect(rgb, `could not parse ${value}`).toBeTruthy();
	if (!rgb) throw new Error(`Could not parse color: ${value}`);
	const inSrgbGamut = (channel: number) => Math.max(0, Math.min(1, channel));
	return [inSrgbGamut(rgb.r), inSrgbGamut(rgb.g), inSrgbGamut(rgb.b)];
}

function relativeLuminance(value: string): number {
	const linear = rgbChannels(value).map((channel) =>
		channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
	);
	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function wcagContrast(foreground: string, background: string): number {
	const foregroundLuminance = relativeLuminance(foreground);
	const backgroundLuminance = relativeLuminance(background);
	return (
		(Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
		(Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
	);
}

function apcaContrast(foreground: string, background: string): number {
	const toSrgb = (value: string) =>
		rgbChannels(value).map((channel) => channel * 255);
	return Number(
		APCAcontrast(sRGBtoY(toSrgb(foreground)), sRGBtoY(toSrgb(background))),
	);
}

type Pair = {
	name: string;
	foreground: string;
	background: string;
	minimumWcag: number;
	apca:
		| { kind: "font-lookup"; fontSizePx: number; fontWeight: number }
		| { kind: "spot-text"; minimumLc: number };
};

const readablePairs: readonly Pair[] = [
	{
		name: "normal body",
		foreground: "foreground",
		background: "background",
		minimumWcag: 4.5,
		apca: { kind: "font-lookup", fontSizePx: 16, fontWeight: 400 },
	},
	{
		name: "secondary body",
		foreground: "foreground-secondary",
		background: "background",
		minimumWcag: 4.5,
		apca: { kind: "font-lookup", fontSizePx: 16, fontWeight: 500 },
	},
	{
		name: "muted helper",
		foreground: "muted-foreground",
		background: "muted",
		minimumWcag: 4.5,
		apca: { kind: "font-lookup", fontSizePx: 16, fontWeight: 500 },
	},
	{
		name: "primary action",
		foreground: "primary-foreground",
		background: "primary",
		minimumWcag: 4.5,
		apca: { kind: "spot-text", minimumLc: 60 },
	},
	{
		name: "secondary action",
		foreground: "secondary-foreground",
		background: "secondary",
		minimumWcag: 4.5,
		apca: { kind: "spot-text", minimumLc: 60 },
	},
	{
		name: "sidebar content",
		foreground: "sidebar-foreground",
		background: "sidebar",
		minimumWcag: 4.5,
		apca: { kind: "spot-text", minimumLc: 60 },
	},
	...(["success", "warning", "info", "destructive"] as const).map(
		(status): Pair => ({
			name: `${status} status badge`,
			foreground: `${status}-subtle-foreground`,
			background: `${status}-subtle`,
			minimumWcag: 4.5,
			apca: { kind: "font-lookup", fontSizePx: 14, fontWeight: 700 },
		}),
	),
];

describe("@afenda/ui-system — APCA and WCAG color contracts", () => {
	it.each(
		Object.entries(modes),
	)("keeps readable %s pairs within their component typography contract", (_mode, palette) => {
		for (const pair of readablePairs) {
			const foreground = palette.get(pair.foreground);
			const background = palette.get(pair.background);
			expect(foreground, pair.foreground).toBeTruthy();
			expect(background, pair.background).toBeTruthy();
			if (!foreground || !background) continue;

			const wcag = wcagContrast(foreground, background);
			const apca = Math.abs(apcaContrast(foreground, background));
			expect(
				wcag,
				`${pair.name} WCAG ${wcag.toFixed(2)}`,
			).toBeGreaterThanOrEqual(pair.minimumWcag);

			if (pair.apca.kind === "spot-text") {
				expect(
					apca,
					`${pair.name} APCA Lc ${apca.toFixed(1)}`,
				).toBeGreaterThanOrEqual(pair.apca.minimumLc);
				continue;
			}

			const lookup = fontLookupAPCA(apca);
			const weightIndex = pair.apca.fontWeight / 100;
			const minimumSize = Number(lookup[weightIndex]);
			expect(
				minimumSize,
				`${pair.name} requires ${minimumSize}px at ${pair.apca.fontWeight}`,
			).toBeLessThanOrEqual(pair.apca.fontSizePx);
		}
	});

	it.each(
		Object.entries(modes),
	)("keeps the actual %s destructive action pair readable", (mode, palette) => {
		const background = palette.get(
			mode === "dark" ? "destructive-soft" : "destructive",
		);
		const foreground = "oklch(1 0 0)";
		expect(background).toBeTruthy();
		if (!background) return;

		expect(wcagContrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
		expect(
			Math.abs(apcaContrast(foreground, background)),
		).toBeGreaterThanOrEqual(60);
	});

	it.each(
		Object.entries(modes),
	)("keeps %s focus and invalid-control indicators above 3:1", (_mode, palette) => {
		const background = palette.get("background");
		const focus = palette.get("ring-focus");
		const invalid = palette.get("destructive");
		expect(background).toBeTruthy();
		expect(focus).toBeTruthy();
		expect(invalid).toBeTruthy();
		if (!background || !focus || !invalid) return;

		expect(wcagContrast(focus, background)).toBeGreaterThanOrEqual(3);
		expect(wcagContrast(invalid, background)).toBeGreaterThanOrEqual(3);
	});
});

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const absolute = path.join(directory, entry);
		if (
			[
				".next",
				".turbo",
				"__tests__",
				"node_modules",
				"shadcn-studio",
			].includes(entry)
		)
			return [];
		if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
		return absolute.endsWith(".tsx") ? [absolute] : [];
	});
}

describe("@afenda/ui-system — readable status token usage", () => {
	it("keeps APCA typography fixtures synchronized with readable components", () => {
		const fixtures = [
			{
				file: path.join(
					packageRoot,
					"src",
					"components",
					"ui",
					"status-badge.tsx",
				),
				contract: "text-sm font-bold",
			},
			{
				file: path.join(
					packageRoot,
					"src",
					"components",
					"ui",
					"metric-card.tsx",
				),
				contract: "text-sm font-bold",
			},
			{
				file: path.join(
					packageRoot,
					"src",
					"components",
					"ui",
					"form-error.tsx",
				),
				contract: "text-sm font-bold",
			},
			{
				file: path.join(
					repoRoot,
					"apps",
					"web",
					"features",
					"human-resources",
					"retry-event-form.tsx",
				),
				contract: "text-sm font-bold text-success-subtle-foreground",
			},
		] as const;

		for (const fixture of fixtures) {
			expect(readFileSync(fixture.file, "utf8"), fixture.file).toContain(
				fixture.contract,
			);
		}
	});

	it("does not use chromatic accent tokens as readable text", () => {
		const roots = [
			path.join(packageRoot, "src"),
			path.join(repoRoot, "apps", "web"),
		];
		const violations = roots.flatMap(sourceFiles).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return /\btext-(?:success|warning|info)(?=[\s"'])/.test(source)
				? [path.relative(repoRoot, file)]
				: [];
		});

		expect(violations).toEqual([]);
	});
});
