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
const uiFiles = readdirSync(uiDir)
	.filter((f) => f.endsWith(".tsx"))
	.map((f) => f.replace(/\.tsx$/, ""));
const srcFiles = (dir: string): string[] =>
	readdirSync(path.join(pkgRoot, dir), { withFileTypes: true }).flatMap((e) =>
		e.isDirectory()
			? srcFiles(path.posix.join(dir, e.name))
			: [path.posix.join(dir, e.name)],
	);

describe("@afenda/ui-system — flat barrel coverage", () => {
	const barrel = read("src/index.ts");

	it("re-exports every components/ui primitive from the flat barrel", () => {
		const missing = uiFiles.filter(
			(name) => !barrel.includes(`./components/ui/${name}`),
		);
		expect(missing, `primitives missing from src/index.ts: ${missing}`).toEqual(
			[],
		);
	});

	it("does not declare a client boundary in the root barrel", () => {
		expect(barrel).not.toMatch(/^["']use client["']/m);
	});
});

describe("@afenda/ui-system — public surface", () => {
	const pkg = JSON.parse(read("package.json")) as {
		exports: Record<string, unknown>;
	};

	it("exposes only the flat barrel and governed stylesheets", () => {
		expect(Object.keys(pkg.exports).sort()).toEqual([
			".",
			"./base.css",
			"./styles.css",
		]);
	});

	it("keeps tokens and shared rendering defaults in separate stylesheets", () => {
		const tokens = read("src/styles/tokens.css");
		const base = read("src/styles/base.css");

		expect(tokens).not.toMatch(/@layer\s+base/);
		expect(base).toContain("@layer base");
		expect(base).toContain("border-color: var(--border)");
		expect(base).toContain("background-color: var(--canvas)");
		expect(base).toContain("color: var(--foreground)");
		expect(base).toContain("color-scheme: light");
		expect(base).toContain("color-scheme: dark");
		expect(base).not.toMatch(/--(?:canvas|background|foreground):/);
		expect(tokens).not.toMatch(/--font-(?:sans|mono)\s*:/);
		expect(base).not.toMatch(/\bmargin\s*:/);
	});
});

describe("@afenda/ui-system — no external registry noise", () => {
	const cfg = JSON.parse(read("components.json")) as {
		style: string;
		iconLibrary: string;
		registries?: unknown;
		aliases: Record<string, string>;
	};

	it("pins the Radix (new-york) style and lucide icons", () => {
		expect(cfg.style).toBe("new-york");
		expect(cfg.iconLibrary).toBe("lucide");
	});

	it("declares no external registries", () => {
		expect(cfg.registries).toBeUndefined();
	});

	it("uses only package # subpath aliases", () => {
		for (const alias of Object.values(cfg.aliases)) {
			expect(alias.startsWith("#")).toBe(true);
		}
	});
});

describe("@afenda/ui-system — dependency + styling consistency", () => {
	const tsx = srcFiles("src").filter((f) => f.endsWith(".tsx"));
	const rawPaletteUtility = new RegExp(
		"\\b(?:bg|text|border|ring|outline|divide|shadow|accent|caret|fill|stroke|decoration|from|via|to)-" +
			"(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-" +
			"(?:50|100|200|300|400|500|600|700|800|900|950)|black|white)(?:\\/\\d{1,3})?\\b",
	);
	const forbiddenIconPkgs = [
		"@radix-ui/react-icons",
		"react-icons",
		"@heroicons/react",
		"@tabler/icons-react",
	];

	it("imports icons only from lucide-react", () => {
		const offenders: string[] = [];
		for (const rel of tsx) {
			const src = read(rel);
			for (const pkgName of forbiddenIconPkgs) {
				if (src.includes(`from "${pkgName}"`)) {
					offenders.push(`${rel} -> ${pkgName}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("uses semantic tokens, not raw color literals, in component source", () => {
		const rawColor = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(/;
		const offenders = tsx.filter((rel) => rawColor.test(read(rel)));
		expect(offenders, `raw color literals found in: ${offenders}`).toEqual([]);
	});

	it("uses semantic tokens, not raw Tailwind palette utilities", () => {
		const offenders = tsx.filter((rel) => rawPaletteUtility.test(read(rel)));
		expect(offenders, `raw palette utilities found in: ${offenders}`).toEqual(
			[],
		);
	});

	it("uses Tailwind v4 canonical custom-property utilities", () => {
		const offenders = tsx.filter((rel) => /\[var\(--/.test(read(rel)));
		expect(
			offenders,
			`legacy custom-property utilities found in: ${offenders}`,
		).toEqual([]);
	});
});

describe("@afenda/ui-system — compose type lock (afenda-elite-ui-compose)", () => {
	it("Empty title uses section type lock font-medium text-lg", () => {
		const src = read("src/components/ui/empty.tsx");
		expect(src).toMatch(/font-medium text-foreground text-lg/);
		expect(src).not.toMatch(/text-lg font-semibold/);
	});

	it("CardTitle uses section type lock font-medium text-lg", () => {
		const src = read("src/components/ui/card.tsx");
		expect(src).toMatch(/CardTitle[\s\S]*?font-medium text-lg/);
	});

	it("Card root documents Card-only rounded-xl exception", () => {
		const src = read("src/components/ui/card.tsx");
		expect(src).toMatch(/rounded-xl/);
	});
});
