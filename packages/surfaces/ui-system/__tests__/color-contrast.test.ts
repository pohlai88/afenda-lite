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

function declarations(block: string): ReadonlyMap<string, string> {
	return new Map(
		[...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [
			match[1],
			match[2].trim(),
		]),
	);
}

function mergeDeclarations(
	...palettes: readonly ReadonlyMap<string, string>[]
): ReadonlyMap<string, string> {
	return new Map(palettes.flatMap((palette) => [...palette]));
}

const rootStart = tokens.indexOf("\n:root {");
const rootDeclarations = declarations(blockBetween(tokens, "\n:root {", "\n}"));
const darkOverrides = declarations(
	blockBetween(tokens, "\n.dark {", "\n}", rootStart + 1),
);

const modes = {
	light: rootDeclarations,
	dark: mergeDeclarations(rootDeclarations, darkOverrides),
} as const;

function resolveColor(
	palette: ReadonlyMap<string, string>,
	name: string,
	seen = new Set<string>(),
): string {
	if (seen.has(name)) {
		throw new Error(`Circular color alias: ${name}`);
	}
	seen.add(name);
	const value = palette.get(name);
	// biome-ignore lint/suspicious/noMisplacedAssertion: This resolver helper executes only inside test cases.
	expect(value, `missing --${name}`).toBeTruthy();
	if (!value) {
		throw new Error(`Missing color token: --${name}`);
	}
	const alias = value.match(/^var\(--([\w-]+)\)$/);
	return alias?.[1] ? resolveColor(palette, alias[1], seen) : value;
}

const toRgb = converter("rgb");

function rgbChannels(value: string): readonly [number, number, number] {
	const parsed = parse(value);
	const rgb = parsed ? toRgb(parsed) : undefined;
	// biome-ignore lint/suspicious/noMisplacedAssertion: This conversion helper executes only inside test cases.
	expect(rgb, `could not parse ${value}`).toBeTruthy();
	if (!rgb) {
		throw new Error(`Could not parse color: ${value}`);
	}
	const inSrgbGamut = (channel: number) => Math.max(0, Math.min(1, channel));
	return [inSrgbGamut(rgb.r), inSrgbGamut(rgb.g), inSrgbGamut(rgb.b)];
}

function relativeLuminance(value: string): number {
	const linear = rgbChannels(value).map((channel) =>
		channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
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

interface Pair {
	apca:
		| { kind: "font-lookup"; fontSizePx: number; fontWeight: number }
		| { kind: "spot-text"; minimumLc: number }
		| null;
	background: string;
	foreground: string;
	minimumWcag: number;
	name: string;
}

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
		name: "tertiary body",
		foreground: "foreground-tertiary",
		background: "background",
		minimumWcag: 4.5,
		apca: { kind: "font-lookup", fontSizePx: 16, fontWeight: 500 },
	},
	{
		name: "muted helper",
		foreground: "muted-foreground",
		background: "background",
		minimumWcag: 4.5,
		apca: null,
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
		name: "accent interaction",
		foreground: "accent-foreground",
		background: "accent",
		minimumWcag: 4.5,
		apca: { kind: "spot-text", minimumLc: 60 },
	},
	{
		name: "destructive action",
		foreground: "destructive-foreground",
		background: "destructive-soft",
		minimumWcag: 4.5,
		apca: { kind: "spot-text", minimumLc: 60 },
	},
	...(
		[
			"background",
			"card",
			"surface-raised",
			"popover",
			"destructive-subtle",
		] as const
	).map(
		(background): Pair => ({
			name: `destructive text on ${background}`,
			foreground: "destructive-subtle-foreground",
			background,
			minimumWcag: 4.5,
			apca: { kind: "spot-text", minimumLc: 60 },
		}),
	),
	{
		name: "sidebar content",
		foreground: "sidebar-foreground",
		background: "sidebar",
		minimumWcag: 4.5,
		apca: { kind: "spot-text", minimumLc: 60 },
	},
	{
		name: "sidebar primary action",
		foreground: "sidebar-primary-foreground",
		background: "sidebar-primary",
		minimumWcag: 4.5,
		apca: { kind: "spot-text", minimumLc: 60 },
	},
	...(["success", "warning", "info"] as const).map(
		(status): Pair => ({
			name: `${status} solid pair`,
			foreground: `${status}-foreground`,
			background: status,
			minimumWcag: 4.5,
			apca: { kind: "spot-text", minimumLc: 60 },
		}),
	),
	...(["success", "warning", "info", "destructive"] as const).map(
		(status): Pair => ({
			name: `${status} status badge`,
			foreground: `${status}-subtle-foreground`,
			background: `${status}-subtle`,
			minimumWcag: 4.5,
			apca: { kind: "font-lookup", fontSizePx: 14, fontWeight: 500 },
		}),
	),
];

describe("@afenda/ui-system — APCA and WCAG color contracts", () => {
	it.each(
		Object.entries(modes),
	)("keeps readable %s pairs within their component typography contract", (_mode, palette) => {
		for (const pair of readablePairs) {
			const foreground = resolveColor(palette, pair.foreground);
			const background = resolveColor(palette, pair.background);

			const wcag = wcagContrast(foreground, background);
			const apca = Math.abs(apcaContrast(foreground, background));
			expect(
				wcag,
				`${pair.name} WCAG ${wcag.toFixed(2)}`,
			).toBeGreaterThanOrEqual(pair.minimumWcag);

			if (!pair.apca) {
				continue;
			}

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
		const background = resolveColor(
			palette,
			mode === "dark" ? "destructive-soft" : "destructive",
		);
		const foreground = resolveColor(palette, "destructive-foreground");

		expect(wcagContrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
		expect(
			Math.abs(apcaContrast(foreground, background)),
		).toBeGreaterThanOrEqual(60);
	});

	it.each(
		Object.entries(modes),
	)("keeps %s focus and invalid-control indicators above 3:1", (_mode, palette) => {
		const background = resolveColor(palette, "background");
		const focus = resolveColor(palette, "ring-focus");
		const invalid = resolveColor(palette, "destructive");

		expect(wcagContrast(focus, background)).toBeGreaterThanOrEqual(3);
		expect(wcagContrast(invalid, background)).toBeGreaterThanOrEqual(3);
	});

	it.each(
		Object.entries(modes),
	)("keeps the complete %s text ladder readable on approved surfaces", (_mode, palette) => {
		const textRoles = [
			["foreground", 400],
			["foreground-secondary", 500],
			["foreground-tertiary", 500],
		] as const;
		const surfaces = [
			"canvas",
			"surface-sunken",
			"background",
			"card",
			"surface-raised",
			"popover",
		] as const;

		for (const [foregroundName, fontWeight] of textRoles) {
			for (const backgroundName of surfaces) {
				const foreground = resolveColor(palette, foregroundName);
				const background = resolveColor(palette, backgroundName);
				const wcag = wcagContrast(foreground, background);
				const apca = Math.abs(apcaContrast(foreground, background));
				const minimumSize = Number(fontLookupAPCA(apca)[fontWeight / 100]);

				expect(
					wcag,
					`${foregroundName}/${backgroundName} WCAG ${wcag.toFixed(2)}`,
				).toBeGreaterThanOrEqual(4.5);
				expect(
					minimumSize,
					`${foregroundName}/${backgroundName} requires ${minimumSize}px at ${fontWeight}`,
				).toBeLessThanOrEqual(16);
			}
		}
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
		) {
			return [];
		}
		if (statSync(absolute).isDirectory()) {
			return sourceFiles(absolute);
		}
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
				contract: "font-medium text-sm",
			},
			{
				file: path.join(
					packageRoot,
					"src",
					"components",
					"ui",
					"metric-card.tsx",
				),
				contract: "font-bold text-sm",
			},
			{
				file: path.join(
					packageRoot,
					"src",
					"components",
					"ui",
					"form-error.tsx",
				),
				contract: "font-bold text-sm",
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

	it("does not use the solid destructive fill token as package text", () => {
		const violations = sourceFiles(path.join(packageRoot, "src")).flatMap(
			(file) => {
				const source = readFileSync(file, "utf8");
				return /\btext-destructive(?=[\s"'!])/.test(source)
					? [path.relative(repoRoot, file)]
					: [];
			},
		);

		expect(violations).toEqual([]);
	});
});
