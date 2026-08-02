import type { GeneratorFamilyContractDefinition } from "../engine/types.ts";

export const erpContractDefinition = {
	family: "erp",
	release: { state: "internal" },
	engineCompatibility: 1,
	modes: [{ id: "doctor", writes: false }],
	capabilities: [
		{ id: "manifest-projection", status: "declared" },
		{ id: "feature-first-layout", status: "declared" },
		{ id: "public-api-projection", status: "declared" },
		{ id: "projection-lock", status: "declared" },
		{ id: "create-feature", status: "declared" },
		{ id: "versioned-treatment", status: "declared" },
	],
	profiles: [{ id: "feature-first-erp" }],
	semanticInput: {
		adapter: "erp-semantic-contract-adapter",
		canonicalOwners: [
			"module-definition",
			"operation-registry",
			"package-public-api",
			"workspace-edge-register",
		],
	},
	pathPolicy: {
		workspaceRoots: ["packages/erp"],
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
