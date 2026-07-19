/**
 * Node ESM resolve/load hooks for Fumadocs MDX Runtime Loader scripts.
 * SSOT: docs-V2/docs/fumadocs-mdx-node.md
 *
 * Resolves `@/*` + `collections/*` (tsconfig paths) and serves static assets
 * as URL modules when MDX evaluates under Node (Next/webpack role offline).
 */
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

let appRoot = process.cwd();

const SOURCE_EXTS = [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"];
const ASSET_EXT =
	/\.(?:svg|png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|eot|mp4|webm|pdf|css|scss|sass|less)(?:\?.*)?$/i;

/**
 * @param {string} absBase
 * @returns {string | null}
 */
function resolveFile(absBase) {
	if (existsSync(absBase) && extname(absBase)) {
		return absBase;
	}
	for (const ext of SOURCE_EXTS) {
		const candidate = `${absBase}${ext}`;
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	for (const ext of SOURCE_EXTS) {
		const candidate = join(absBase, `index${ext}`);
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return null;
}

/**
 * @param {{ appRoot?: string } | undefined} data
 */
export async function initialize(data) {
	if (data && typeof data.appRoot === "string") {
		appRoot = data.appRoot;
	}
}

/**
 * @param {string} specifier
 * @param {object} context
 * @param {(specifier: string, context: object) => Promise<object>} nextResolve
 */
export async function resolve(specifier, context, nextResolve) {
	if (
		specifier === "fumadocs-openapi" ||
		specifier.startsWith("fumadocs-openapi/")
	) {
		const inventoryOpenapi = join(
			appRoot,
			"scripts/node-inventory-openapi.mjs",
		);
		return nextResolve(pathToFileURL(inventoryOpenapi).href, context);
	}
	if (
		specifier === "@/lib/source" ||
		specifier.startsWith("@/lib/source.")
	) {
		return nextResolve(
			pathToFileURL(join(appRoot, "scripts/node-inventory-source.mjs")).href,
			context,
		);
	}
	if (
		specifier === "@/lib/build-graph" ||
		specifier.startsWith("@/lib/build-graph.")
	) {
		return nextResolve(
			pathToFileURL(
				join(appRoot, "scripts/node-inventory-build-graph.mjs"),
			).href,
			context,
		);
	}
	if (specifier.startsWith("@/")) {
		const resolved = resolveFile(join(appRoot, specifier.slice(2)));
		if (resolved) {
			return nextResolve(pathToFileURL(resolved).href, context);
		}
	}
	if (specifier.startsWith("collections/")) {
		const rel = specifier.slice("collections/".length);
		const resolved = resolveFile(join(appRoot, ".source", rel));
		if (resolved) {
			return nextResolve(pathToFileURL(resolved).href, context);
		}
	}
	return nextResolve(specifier, context);
}

/**
 * @param {string} url
 * @param {object} context
 * @param {(url: string, context: object) => Promise<object>} nextLoad
 */
export async function load(url, context, nextLoad) {
	const pathOnly = url.split("?")[0] ?? url;
	if (ASSET_EXT.test(pathOnly)) {
		return {
			format: "module",
			shortCircuit: true,
			source: `export default ${JSON.stringify(url)};`,
		};
	}
	return nextLoad(url, context);
}
