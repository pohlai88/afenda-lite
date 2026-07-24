/**
 * Gate: workspace editor posture — Biome LSP, tsserver caps, watcher excludes.
 *
 * Run: pnpm check:editor-biome
 */
import { execSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
	BIOME_FORMATTER_LANGUAGES,
	BIOME_LSP_BIN_PLATFORM_MAP,
	FORBIDDEN_SETTING_KEYS,
	NODE_WRAPPER_LSP_BIN,
	REQUIRED_SCALAR_SETTINGS,
	REQUIRED_TS_WATCH_OPTIONS,
	TAILWIND_FILES_EXCLUDE,
	WATCHER_EXCLUDE_PATTERNS,
	deepEqual,
	expectSetting,
	missingExcludePatterns,
} from "./lib/editor-posture.mjs";
import { resolveBiomeNativeBin } from "./lib/resolve-biome-native-bin.mjs";

const root = process.cwd();
const settingsPath = path.join(root, ".vscode", "settings.json");
const requireFromRoot = createRequire(path.join(root, "package.json"));

/** @type {string[]} */
const errors = [];

function debugLog(message, data) {
	if (!process.env.DEBUG_RUN_ID) {
		return;
	}
	const line = JSON.stringify({
		runId: process.env.DEBUG_RUN_ID,
		location: "scripts/check-editor-biome.mjs",
		message,
		data,
		timestamp: Date.now(),
	});
	try {
		appendFileSync(path.join(root, "debug-45bc6e.log"), `${line}\n`);
	} catch {
		// fail open
	}
}

function readSettings() {
	if (!existsSync(settingsPath)) {
		errors.push(".vscode/settings.json is missing");
		return null;
	}
	const raw = readFileSync(settingsPath, "utf8");
	try {
		return JSON.parse(raw);
	} catch {
		errors.push(".vscode/settings.json is not valid JSON");
		return null;
	}
}

/**
 * @param {unknown} lspBin
 * @returns {string | null}
 */
function resolveLspBinPath(lspBin) {
	if (typeof lspBin === "string" && lspBin.trim()) {
		return path.resolve(root, lspBin);
	}
	if (lspBin && typeof lspBin === "object") {
		const key = `${process.platform}-${process.arch}`;
		const candidate =
			/** @type {Record<string, string>} */ (lspBin)[key] ??
			/** @type {Record<string, string>} */ (lspBin)[process.platform];
		if (typeof candidate === "string" && candidate.trim()) {
			return path.resolve(root, candidate);
		}
	}
	return null;
}

/**
 * @param {Record<string, unknown>} settings
 */
function checkScalarPosture(settings) {
	for (const [key, expected] of Object.entries(REQUIRED_SCALAR_SETTINGS)) {
		const err = expectSetting(settings, key, expected);
		if (err) {
			errors.push(err);
		}
	}
	for (const key of FORBIDDEN_SETTING_KEYS) {
		if (key in settings) {
			errors.push(`${key} is deprecated — remove from .vscode/settings.json`);
		}
	}
}

/**
 * @param {Record<string, unknown>} settings
 */
function checkBiomeSettings(settings) {
	const lspBin = settings["biome.lsp.bin"];
	if (!lspBin || typeof lspBin !== "object") {
		errors.push("biome.lsp.bin must be a platform map to native @biomejs/cli-* binaries");
		return;
	}
	if (!deepEqual(lspBin, BIOME_LSP_BIN_PLATFORM_MAP)) {
		errors.push("biome.lsp.bin platform map must match scripts/lib/editor-posture.mjs");
	}
	if (typeof lspBin === "string" && lspBin === NODE_WRAPPER_LSP_BIN) {
		errors.push(
			"biome.lsp.bin must not use @biomejs/biome/bin/biome node wrapper",
		);
	}

	const nativeBin = resolveBiomeNativeBin(root);
	if (!nativeBin) {
		errors.push(
			`native Biome binary missing for ${process.platform}-${process.arch} — run pnpm install`,
		);
		return;
	}

	const versionResult = spawnSync(nativeBin, ["--version"], {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	if (versionResult.status !== 0) {
		errors.push(
			`native biome binary failed --version: ${versionResult.stderr || versionResult.stdout}`,
		);
		return;
	}
	debugLog("native biome version", { version: (versionResult.stdout || "").trim() });

	const resolved = resolveLspBinPath(lspBin);
	if (!resolved || !existsSync(resolved)) {
		errors.push(
			`biome.lsp.bin hoisted path missing for ${process.platform}-${process.arch} — run pnpm install`,
		);
	}
}

/**
 * @param {Record<string, unknown>} settings
 */
function checkTypeScriptPosture(settings) {
	const watchOptions = settings["typescript.tsserver.watchOptions"];
	if (!watchOptions || typeof watchOptions !== "object") {
		errors.push("typescript.tsserver.watchOptions is required");
		return;
	}
	if (!deepEqual(watchOptions, REQUIRED_TS_WATCH_OPTIONS)) {
		errors.push("typescript.tsserver.watchOptions must match editor posture SSOT");
	}
}

/**
 * @param {Record<string, unknown>} settings
 */
function checkExtensionPosture(settings) {
	const tailwindExclude = settings["tailwindCSS.files.exclude"];
	if (!Array.isArray(tailwindExclude)) {
		errors.push("tailwindCSS.files.exclude must be set");
		return;
	}
	if (!deepEqual(tailwindExclude, TAILWIND_FILES_EXCLUDE)) {
		errors.push("tailwindCSS.files.exclude must match editor posture SSOT");
	}
}

/**
 * @param {Record<string, unknown>} settings
 */
function checkFormatters(settings) {
	for (const lang of BIOME_FORMATTER_LANGUAGES) {
		const block = settings[`[${lang}]`];
		if (
			!block ||
			typeof block !== "object" ||
			/** @type {Record<string, unknown>} */ (block)[
				"editor.defaultFormatter"
			] !== "biomejs.biome"
		) {
			errors.push(`[${lang}].editor.defaultFormatter must be "biomejs.biome"`);
		}
	}

	const mdBlock = settings["[markdown]"];
	if (
		mdBlock &&
		typeof mdBlock === "object" &&
		/** @type {Record<string, unknown>} */ (mdBlock)[
			"editor.defaultFormatter"
		] === "biomejs.biome"
	) {
		errors.push("[markdown] must not use biomejs.biome — Biome force-ignores md");
	}
}

/**
 * @param {Record<string, unknown>} settings
 */
function checkExplorerLatencyGuards(settings) {
	errors.push(
		...missingExcludePatterns(
			/** @type {Record<string, unknown>} */ (settings["files.watcherExclude"]),
			"files.watcherExclude",
			WATCHER_EXCLUDE_PATTERNS,
		),
	);
}

function checkWorkspaceBinary() {
	try {
		const wrapper = requireFromRoot.resolve("@biomejs/biome/bin/biome");
		if (!existsSync(wrapper)) {
			errors.push("@biomejs/biome/bin/biome missing — run pnpm install");
		}
	} catch {
		errors.push("@biomejs/biome is not installed — run pnpm install");
	}
}

function checkCliFormatsTs() {
	const sample = path.join(
		root,
		"packages",
		"erp",
		"human-resources",
		"src",
		"schemas.ts",
	);
	if (!existsSync(sample)) {
		return;
	}
	try {
		execSync(`pnpm exec biome check "${sample}"`, {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (err) {
		errors.push(`pnpm exec biome check failed on sample TS: ${String(err)}`);
	}
}

function checkLspProxyStaysAlive() {
	const nativeBin = resolveBiomeNativeBin(root);
	if (!nativeBin) {
		return;
	}

	const child = spawnSync(nativeBin, ["lsp-proxy", "--stdio"], {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...process.env,
			BIOME_CONFIG_PATH: "./biome.jsonc",
		},
		timeout: 2500,
	});

	if (child.error?.name === "Error" && child.error.message.includes("ETIMEDOUT")) {
		debugLog("lsp-proxy smoke ok", { nativeBin });
		return;
	}

	if (child.status === null && child.signal === "SIGTERM") {
		debugLog("lsp-proxy smoke ok", { nativeBin });
		return;
	}

	const stderr = (child.stderr || "").trim();
	if (stderr.includes("FATAL") || stderr.includes("INTERNAL")) {
		errors.push(`biome lsp-proxy emitted fatal/internal diagnostics: ${stderr.slice(0, 500)}`);
		return;
	}

	if (child.status !== null && child.status !== 0) {
		errors.push(
			`biome lsp-proxy exited early (code ${child.status}): ${stderr || child.stdout || "no output"}`,
		);
	}
}

const settings = readSettings();
if (settings) {
	checkScalarPosture(settings);
	checkBiomeSettings(settings);
	checkTypeScriptPosture(settings);
	checkExtensionPosture(settings);
	checkFormatters(settings);
	checkExplorerLatencyGuards(settings);
}
checkWorkspaceBinary();
checkCliFormatsTs();
checkLspProxyStaysAlive();

if (errors.length > 0) {
	console.error("check-editor-biome: FAIL");
	for (const err of errors) {
		console.error(`  - ${err}`);
	}
	console.error("Fix .vscode/settings.json — see docs-V2/lint/README.md#editor");
	process.exit(1);
}

console.log("check-editor-biome: OK");
