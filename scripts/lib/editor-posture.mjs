/**
 * SSOT for workspace editor posture (.vscode/settings.json).
 * Consumed by check-editor-biome.mjs and no-editor-biome-drift.mjs.
 */

/** Explorer-hidden trees (docs-V2 stays visible — watcher-only). */
export const FILES_EXCLUDE_PATTERNS = [
	"**/node_modules",
	"**/.next",
	"**/.next-ui",
	"**/.next-workflow",
	"**/.turbo",
	"**/dist",
	"**/build",
	"**/coverage",
	"**/test-results",
	"**/playwright-report",
	"**/out",
	"**/.artifacts",
	"**/_reference",
	"**/.source",
	"**/.tmp",
	"**/.vercel",
	"**/.cursor",
	"**/.agents",
	"**/*.tsbuildinfo",
];

/** Watcher excludes (includes watcher-only heavy trees). */
export const WATCHER_EXCLUDE_PATTERNS = [
	"**/node_modules/**",
	"**/.next/**",
	"**/.next-ui/**",
	"**/.next-workflow/**",
	"**/.turbo/**",
	"**/dist/**",
	"**/build/**",
	"**/coverage/**",
	"**/test-results/**",
	"**/playwright-report/**",
	"**/out/**",
	"**/.artifacts/**",
	"**/_reference/**",
	"**/.source/**",
	"**/.tmp/**",
	"**/.vercel/**",
	"**/.cursor/**",
	"**/.agents/**",
	"**/*.tsbuildinfo",
	"**/.git/**",
	"**/pnpm-lock.yaml",
	"**/docs-V2/**",
	"**/e2e/**",
	"**/packages/data-plane/db/drizzle/**",
	"**/apps/web/shadcn-studio/**",
	"**/.pnpm/**",
];

export const TAILWIND_FILES_EXCLUDE = [
	"**/.git/**",
	"**/node_modules/**",
	"**/.cursor/**",
	"**/.agents/**",
	"**/docs-V2/**",
	"**/packages/data-plane/db/drizzle/**",
	"**/apps/web/shadcn-studio/**",
	"**/e2e/**",
];

export const BIOME_LSP_BIN_PLATFORM_MAP = {
	"win32-x64": "./node_modules/@biomejs/cli-win32-x64/biome.exe",
	"win32-arm64": "./node_modules/@biomejs/cli-win32-arm64/biome.exe",
	"darwin-x64": "./node_modules/@biomejs/cli-darwin-x64/biome",
	"darwin-arm64": "./node_modules/@biomejs/cli-darwin-arm64/biome",
	"linux-x64": "./node_modules/@biomejs/cli-linux-x64/biome",
	"linux-arm64": "./node_modules/@biomejs/cli-linux-arm64/biome",
};

export const TS_WATCH_EXCLUDE_DIRECTORIES = [
	"**/node_modules",
	"**/.git",
	"**/.turbo",
	"**/.next",
	"**/dist",
	"**/docs-V2",
];

/** Scalar settings that must match exactly. */
export const REQUIRED_SCALAR_SETTINGS = {
	"biome.enabled": true,
	"biome.requireConfiguration": true,
	"biome.configurationPath": "./biome.jsonc",
	"biome.runFromTemporaryLocation": true,
	"biome.lsp.watcher.kind": "none",
	"explorer.excludeGitIgnore": false,
	"explorer.autoReveal": false,
	"typescript.disableAutomaticTypeAcquisition": true,
	"typescript.tsserver.maxTsServerMemory": 8192,
	"typescript.tsserver.experimental.enableProjectDiagnostics": false,
	"typescript.preferences.includePackageJsonAutoImports": "off",
	"typescript.tsserver.useSyntaxServer": "auto",
	"tailwindCSS.experimental.configFile": "apps/web/postcss.config.mjs",
};

export const REQUIRED_TS_WATCH_OPTIONS = {
	watchFile: "useFsEvents",
	watchDirectory: "useFsEvents",
	fallbackPolling: "dynamicPriority",
	synchronousWatchDirectory: false,
	excludeDirectories: TS_WATCH_EXCLUDE_DIRECTORIES,
};

export const BIOME_FORMATTER_LANGUAGES = [
	"javascript",
	"javascriptreact",
	"typescript",
	"typescriptreact",
	"json",
	"jsonc",
	"css",
];

/** Keys that must not appear in settings.json. */
export const FORBIDDEN_SETTING_KEYS = ["biome.lspBin", "biome.requireConfigFile"];

export const NODE_WRAPPER_LSP_BIN = "./node_modules/@biomejs/biome/bin/biome";

/**
 * @param {Record<string, unknown>} settings
 * @param {string} key
 * @param {unknown} expected
 * @returns {string | null}
 */
export function expectSetting(settings, key, expected) {
	if (!(key in settings)) {
		return `${key} is required`;
	}
	if (!deepEqual(settings[key], expected)) {
		return `${key} must match editor posture SSOT`;
	}
	return null;
}

/**
 * @param {Record<string, unknown>} block
 * @param {string} label
 * @param {string[]} requiredPatterns
 * @returns {string[]}
 */
export function missingExcludePatterns(block, label, requiredPatterns) {
	if (!block || typeof block !== "object") {
		return [`${label} must be set`];
	}
	/** @type {string[]} */
	const missing = [];
	for (const pattern of requiredPatterns) {
		if (/** @type {Record<string, unknown>} */ (block)[pattern] !== true) {
			missing.push(`${label} must include "${pattern}": true`);
		}
	}
	return missing;
}

/**
 * Deep equality for JSON-like values (settings validation).
 * @param {unknown} a
 * @param {unknown} b
 */
export function deepEqual(a, b) {
	if (a === b) {
		return true;
	}
	if (a === null || b === null || typeof a !== typeof b) {
		return false;
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			return false;
		}
		return a.every((item, i) => deepEqual(item, b[i]));
	}
	if (typeof a === "object" && typeof b === "object") {
		const aObj = /** @type {Record<string, unknown>} */ (a);
		const bObj = /** @type {Record<string, unknown>} */ (b);
		const aKeys = Object.keys(aObj);
		const bKeys = Object.keys(bObj);
		if (aKeys.length !== bKeys.length) {
			return false;
		}
		return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
	}
	return false;
}
