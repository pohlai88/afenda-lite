import type { GeneratorFamilyContractDefinition } from "../engine/types.ts";

export const kernelContractDefinition = {
	family: "kernel",
	release: { state: "internal" },
	engineCompatibility: 1,
	modes: [
		{ id: "doctor", writes: false },
		{ id: "plan-upgrade", writes: false },
	],
	capabilities: [
		{ id: "package-structure", status: "declared" },
		{ id: "public-api-projection", status: "declared" },
		{ id: "dependency-policy", status: "declared" },
		{ id: "task-policy", status: "declared" },
		{ id: "package-lock", status: "declared" },
		{ id: "versioned-treatment", status: "declared" },
	],
	profiles: [
		{ id: "foundation-leaf" },
		{ id: "runtime-leaf" },
		{ id: "runtime-configured" },
		{ id: "data-plane" },
		{ id: "control-plane" },
	],
	semanticInput: {
		adapter: "kernel-semantic-contract-adapter",
		canonicalOwners: [
			"package-semantic-registry",
			"package-public-api",
			"workspace-edge-register",
		],
	},
	pathPolicy: {
		workspaceRoots: [
			"packages/foundation",
			"packages/runtime",
			"packages/data-plane",
			"packages/control-plane",
		],
	},
	filePolicy: [],
	namingPolicy: {
		directories: "kebab-case",
		files: "kebab-case",
	},
	entrypointPolicy: {
		root: "src/index.ts",
		auxiliary: [],
	},
	dependencyPolicy: {
		authorizationOwner: "docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
		discoveryAuthorizes: false,
	},
	taskPolicy: {
		requiredScripts: [],
	},
	projections: [],
	diagnostics: [],
	migrations: [],
} satisfies GeneratorFamilyContractDefinition;
