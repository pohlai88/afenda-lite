/**
 * Afenda package README generator.
 *
 * Fills `<!-- AUTO:… -->` markers in `readme.template.md` from a target
 * package's `package.json` (and optional code embeds), then writes `README.md`.
 * Prose outside AUTO markers is preserved.
 *
 * Usage:
 *   pnpm exec tsx docs/template/readme/generate.readme.ts --package packages/foundation/errors
 *   pnpm exec tsx docs/template/readme/generate.readme.ts --package packages/foundation/errors --check
 *
 * Authority: package README orient/link only — not DOC-001 Living spines.
 * Method: afenda-readme-diataxis · monorepo: package-name imports · pnpm --filter.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TOOL_ROOT, "../../..");
const TEMPLATE_PATH = path.join(TOOL_ROOT, "readme.template.md");

type PackageManifest = {
	readonly name?: unknown;
	readonly description?: unknown;
	readonly license?: unknown;
	readonly private?: unknown;
	readonly scripts?: unknown;
};

type GenerateArgs = {
	readonly checkOnly: boolean;
	readonly packageDir: string;
};

const usage = (): string =>
	[
		"Usage:",
		"  pnpm exec tsx docs/template/readme/generate.readme.ts --package <packages/...>",
		"  pnpm exec tsx docs/template/readme/generate.readme.ts --package <packages/...> --check",
	].join("\n");

const parseArgs = (argv: readonly string[]): GenerateArgs => {
	let packageDir: string | undefined;
	let checkOnly = false;
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--check") {
			checkOnly = true;
			continue;
		}
		if (token === "--package") {
			const next = argv[index + 1];
			if (next === undefined || next.startsWith("--")) {
				throw new Error(`--package requires a path.\n${usage()}`);
			}
			packageDir = next;
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${token}\n${usage()}`);
	}
	if (packageDir === undefined) {
		throw new Error(`Missing --package.\n${usage()}`);
	}
	return { packageDir, checkOnly };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readManifest = (packageJsonPath: string): PackageManifest => {
	const raw: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
	if (!isRecord(raw)) {
		throw new Error(`Invalid package.json: ${packageJsonPath}`);
	}
	return raw;
};

const requireString = (value: unknown, label: string): string => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`package.json missing string field: ${label}`);
	}
	return value;
};

const fillMarker = (source: string, key: string, content: string): string => {
	const open = `<!-- AUTO:${key} -->`;
	if (!source.includes(open)) {
		process.stderr.write(`warning: no marker AUTO:${key} — skipped\n`);
		return source;
	}
	const pattern = new RegExp(
		`(<!--\\s*AUTO:${key}\\s*-->)[\\s\\S]*?(<!--\\s*/AUTO:${key}\\s*-->)`,
		"gu",
	);
	return source.replace(pattern, `$1\n${content}\n$2`);
};

const fenceLanguage = (relPath: string): string => {
	const extension = path.extname(relPath).replace(".", "");
	if (extension === "ts" || extension === "tsx" || extension === "mts") {
		return "ts";
	}
	if (extension === "js" || extension === "mjs" || extension === "cjs") {
		return "js";
	}
	if (extension === "json") {
		return "json";
	}
	if (extension === "md") {
		return "md";
	}
	return extension.length > 0 ? extension : "text";
};

const resolveEmbedPath = (relPath: string, packageRoot: string): string | null => {
	const candidates = [
		path.resolve(REPO_ROOT, relPath),
		path.resolve(packageRoot, relPath),
		path.resolve(TOOL_ROOT, relPath),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return null;
};

const fillCodeEmbeds = (source: string, packageRoot: string): string => {
	const pattern =
		/<!--\s*AUTO:CODE:([^\s]+)\s*-->[\s\S]*?<!--\s*\/AUTO:CODE:\1\s*-->/gu;
	return source.replace(pattern, (_match, relPath: string) => {
		const trimmed = relPath.trim();
		const absolutePath = resolveEmbedPath(trimmed, packageRoot);
		if (absolutePath === null) {
			process.stderr.write(`warning: code embed missing: ${trimmed}\n`);
			return `<!-- AUTO:CODE:${trimmed} -->\n<!-- /AUTO:CODE:${trimmed} -->`;
		}
		const code = readFileSync(absolutePath, "utf8").trimEnd();
		const language = fenceLanguage(trimmed);
		return [
			`<!-- AUTO:CODE:${trimmed} -->`,
			`\`\`\`${language}`,
			code,
			"```",
			`<!-- /AUTO:CODE:${trimmed} -->`,
		].join("\n");
	});
};

const buildScriptsTable = (
	packageName: string,
	scripts: unknown,
): string => {
	if (!isRecord(scripts)) {
		return "_No package scripts defined._";
	}
	const rows = Object.entries(scripts)
		.filter(([name]) => typeof name === "string" && !name.startsWith("_"))
		.filter(([, command]) => typeof command === "string")
		.map(
			([name, command]) =>
				`| \`pnpm --filter ${packageName} ${name}\` | \`${command}\` |`,
		);
	if (rows.length === 0) {
		return "_No package scripts defined._";
	}
	return ["| Command | Runs |", "| --- | --- |", ...rows].join("\n");
};

const buildToc = (source: string): string => {
	const entries: string[] = [];
	for (const line of source.split("\n")) {
		const heading = line.match(/^(#{2,3})\s+(.*)$/u);
		if (heading === null) {
			continue;
		}
		const level = heading[1]?.length ?? 2;
		const text = heading[2]?.trim() ?? "";
		if (text.length === 0) {
			continue;
		}
		const anchor = text
			.toLowerCase()
			.replace(/[^\w\s-]/gu, "")
			.replace(/\s+/gu, "-");
		const indent = level === 3 ? "  " : "";
		entries.push(`${indent}- [${text}](#${anchor})`);
	}
	return entries.join("\n");
};

const render = (input: {
	readonly manifest: PackageManifest;
	readonly packageRoot: string;
	readonly template: string;
}): string => {
	const packageName = requireString(input.manifest.name, "name");
	const description =
		typeof input.manifest.description === "string"
			? input.manifest.description
			: "_Add a one-line description in package.json._";
	const license =
		typeof input.manifest.license === "string"
			? input.manifest.license
			: "UNLICENSED";

	let out = input.template;
	out = fillMarker(out, "NAME", packageName);
	out = fillMarker(out, "NAME_INLINE", packageName);
	out = fillMarker(out, "DESCRIPTION", description);
	out = fillMarker(out, "SCRIPTS", buildScriptsTable(packageName, input.manifest.scripts));
	out = fillMarker(
		out,
		"LICENSE",
		`${license} — private workspace package unless published explicitly.`,
	);
	out = fillMarker(
		out,
		"IMPORT",
		[
			"```ts",
			`import { /* public exports */ } from "${packageName}";`,
			"```",
			"",
			"Import from the package name (or a declared `exports` subpath). Never deep-import `@afenda/*/src/...`.",
		].join("\n"),
	);
	out = fillCodeEmbeds(out, input.packageRoot);
	out = fillMarker(out, "TOC", buildToc(out));
	return out.endsWith("\n") ? out : `${out}\n`;
};

const main = (): void => {
	const args = parseArgs(process.argv.slice(2));
	const packageRoot = path.resolve(REPO_ROOT, args.packageDir);
	const packageJsonPath = path.join(packageRoot, "package.json");
	const outputPath = path.join(packageRoot, "README.md");

	if (!existsSync(packageJsonPath)) {
		throw new Error(`package.json not found: ${packageJsonPath}`);
	}
	if (!existsSync(TEMPLATE_PATH)) {
		throw new Error(`template missing: ${TEMPLATE_PATH}`);
	}

	const next = render({
		manifest: readManifest(packageJsonPath),
		packageRoot,
		template: readFileSync(TEMPLATE_PATH, "utf8"),
	});

	if (args.checkOnly) {
		if (!existsSync(outputPath)) {
			process.stderr.write(`README drift: missing ${outputPath}\n`);
			process.exit(1);
		}
		const current = readFileSync(outputPath, "utf8");
		if (current !== next) {
			process.stderr.write(
				`README drift: ${path.relative(REPO_ROOT, outputPath)} would change. Re-run without --check.\n`,
			);
			process.exit(1);
		}
		process.stdout.write(
			`README check ok: ${path.relative(REPO_ROOT, outputPath)}\n`,
		);
		return;
	}

	writeFileSync(outputPath, next, "utf8");
	process.stdout.write(
		`Wrote ${path.relative(REPO_ROOT, outputPath)} from docs/template/readme/readme.template.md\n`,
	);
};

try {
	main();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exit(1);
}
