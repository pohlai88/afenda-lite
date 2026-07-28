import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

export type StorybookContractEvidence = Readonly<{
	componentId: string;
	contractId: string;
	publicExports: readonly [string, ...string[]];
	purpose: string;
	ownership: Readonly<{
		componentOwns: readonly string[];
		consumerOwns: readonly string[];
	}>;
	semanticBoundaries: readonly string[];
	approvedVariants: Readonly<Record<string, StorybookUsageRule>>;
	approvedSizes: Readonly<Record<string, StorybookUsageRule>>;
	rules: readonly string[];
	accessibility: readonly string[];
	prohibitedUsage: readonly string[];
	family: string;
	layer: string;
	qualityProfile: string;
	variants: readonly string[];
	sizes: readonly string[];
	requiredStates: readonly string[];
}>;

export type StorybookUsageRule = Readonly<{
	meaning: string;
	allowedWhen: readonly string[];
	prohibitedWhen: readonly string[];
}>;

const VIRTUAL_MODULE_ID = "virtual:afenda-storybook-evidence";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const EVIDENCE_LOADER_PATH = fileURLToPath(
	new URL("./storybook-evidence-loader.ts", import.meta.url),
);
const METADATA_DIRECTORY = fileURLToPath(
	new URL(
		"../../../packages/surfaces/ui-system/src/metadata/",
		import.meta.url,
	),
);

let cachedEvidence:
	| Readonly<Record<string, StorybookContractEvidence>>
	| undefined;

function deepFreeze<T>(value: T): T {
	if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
		for (const child of Object.values(value)) deepFreeze(child);
		Object.freeze(value);
	}
	return value;
}

export function createStorybookEvidence(): Readonly<
	Record<string, StorybookContractEvidence>
> {
	if (cachedEvidence) return cachedEvidence;
	const serialized = execFileSync(
		process.execPath,
		["--import", "tsx", EVIDENCE_LOADER_PATH],
		{
			encoding: "utf8",
			maxBuffer: 4 * 1024 * 1024,
			windowsHide: true,
		},
	);
	const parsed: unknown = JSON.parse(serialized);
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new TypeError(
			"Storybook evidence loader returned an invalid projection.",
		);
	}
	cachedEvidence = deepFreeze(
		parsed as Record<string, StorybookContractEvidence>,
	);
	return cachedEvidence;
}

function frozenLiteral(value: unknown): string {
	if (Array.isArray(value)) {
		return `Object.freeze([${value.map(frozenLiteral).join(",")}])`;
	}
	if (typeof value === "object" && value !== null) {
		return `Object.freeze({${Object.entries(value)
			.map(([key, entry]) => `${JSON.stringify(key)}:${frozenLiteral(entry)}`)
			.join(",")}})`;
	}
	const serialized = JSON.stringify(value);
	if (serialized === undefined) {
		throw new TypeError("Storybook evidence must be JSON-compatible.");
	}
	return serialized;
}

export function storybookEvidencePlugin(): Plugin {
	return {
		name: "afenda-storybook-contract-evidence",
		configureServer(server) {
			server.watcher.add([EVIDENCE_LOADER_PATH, METADATA_DIRECTORY]);
		},
		handleHotUpdate(context) {
			const changedFile = context.file.replaceAll("\\", "/");
			const loaderPath = EVIDENCE_LOADER_PATH.replaceAll("\\", "/");
			const metadataDirectory = METADATA_DIRECTORY.replaceAll("\\", "/");
			if (
				changedFile !== loaderPath &&
				!changedFile.startsWith(metadataDirectory)
			) {
				return;
			}

			cachedEvidence = undefined;
			const virtualModule = context.server.moduleGraph.getModuleById(
				RESOLVED_VIRTUAL_MODULE_ID,
			);
			if (virtualModule) {
				context.server.moduleGraph.invalidateModule(virtualModule);
			}
			context.server.ws.send({ type: "full-reload" });
			return [];
		},
		resolveId(id) {
			return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : undefined;
		},
		load(id) {
			if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined;
			return `export const storybookEvidence=${frozenLiteral(createStorybookEvidence())};`;
		},
	};
}
