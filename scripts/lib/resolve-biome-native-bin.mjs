/**
 * Resolve the platform-native Biome binary for VS Code/Cursor LSP.
 * pnpm keeps @biomejs/cli-* in the store unless public-hoist-pattern hoists them.
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/** @type {Record<string, { packageName: string; fileName: string }>} */
export const BIOME_NATIVE_BY_PLATFORM = {
	"win32-x64": { packageName: "@biomejs/cli-win32-x64", fileName: "biome.exe" },
	"win32-arm64": {
		packageName: "@biomejs/cli-win32-arm64",
		fileName: "biome.exe",
	},
	"darwin-x64": { packageName: "@biomejs/cli-darwin-x64", fileName: "biome" },
	"darwin-arm64": {
		packageName: "@biomejs/cli-darwin-arm64",
		fileName: "biome",
	},
	"linux-x64": { packageName: "@biomejs/cli-linux-x64", fileName: "biome" },
	"linux-arm64": {
		packageName: "@biomejs/cli-linux-arm64",
		fileName: "biome",
	},
};

/**
 * @param {string} root
 * @param {string} [platform]
 * @param {string} [arch]
 * @returns {string | null}
 */
export function resolveBiomeNativeBin(
	root,
	platform = process.platform,
	arch = process.arch,
) {
	const key = `${platform}-${arch}`;
	const spec = BIOME_NATIVE_BY_PLATFORM[key];
	if (!spec) {
		return null;
	}

	const hoisted = path.join(
		root,
		"node_modules",
		spec.packageName,
		spec.fileName,
	);
	if (existsSync(hoisted)) {
		return hoisted;
	}

	const pnpmDir = path.join(root, "node_modules", ".pnpm");
	if (!existsSync(pnpmDir)) {
		return null;
	}

	const folderPrefix = spec.packageName.replace("/", "+").replace("@", "@");
	const entries = readdirSync(pnpmDir).filter((name) =>
		name.startsWith(`${folderPrefix}@`),
	);
	for (const entry of entries) {
		const candidate = path.join(
			pnpmDir,
			entry,
			"node_modules",
			spec.packageName,
			spec.fileName,
		);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

/**
 * Relative path from repo root for .vscode/settings.json (hoisted layout).
 * @param {string} [platform]
 * @param {string} [arch]
 */
export function hoistedBiomeLspBinSetting(platform = process.platform, arch = process.arch) {
	const key = `${platform}-${arch}`;
	const spec = BIOME_NATIVE_BY_PLATFORM[key];
	if (!spec) {
		return null;
	}
	return `./node_modules/${spec.packageName}/${spec.fileName}`;
}
