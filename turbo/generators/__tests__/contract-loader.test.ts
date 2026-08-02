import { describe, expect, it } from "vitest";

import {
	GeneratorContractValidationError,
	loadGeneratorContractRegistry,
} from "../engine/contract-loader.ts";

interface FamilyFixtureOptions {
	readonly capabilities?: readonly unknown[];
	readonly dependencyPolicy?: unknown;
	readonly diagnostics?: readonly unknown[];
	readonly entrypointPolicy?: unknown;
	readonly filePolicy?: readonly unknown[];
	readonly migrations?: readonly unknown[];
	readonly modes?: readonly unknown[];
	readonly pathPolicy?: unknown;
	readonly profiles?: readonly unknown[];
	readonly projections?: readonly unknown[];
	readonly release?: unknown;
	readonly semanticInput?: unknown;
	readonly taskPolicy?: unknown;
}

const createFamilyFixture = (
	family: "kernel" | "erp",
	options: FamilyFixtureOptions = {},
): Record<string, unknown> => ({
	family,
	release: options.release ?? { state: "internal" },
	engineCompatibility: 1,
	modes: options.modes ?? [{ id: "doctor", writes: false }],
	capabilities: options.capabilities ?? [
		{ id: "structure", status: "declared" },
	],
	profiles: options.profiles ?? [{ id: `${family}-fixture` }],
	semanticInput: options.semanticInput ?? {
		adapter: `${family}-fixture-adapter`,
		canonicalOwners: [`${family}-definition`],
	},
	pathPolicy: options.pathPolicy ?? {
		workspaceRoots: [`packages/${family}`],
	},
	filePolicy: options.filePolicy ?? [
		{
			path: "src/definition.ts",
			disposition: "canonical",
			owner: `${family}-definition`,
			capability: "structure",
		},
		{
			path: "src/index.ts",
			disposition: "projected",
			owner: `${family}-public-api-projection`,
			capability: "structure",
		},
	],
	namingPolicy: {
		directories: "kebab-case",
		files: "kebab-case",
	},
	entrypointPolicy: options.entrypointPolicy ?? {
		root: "src/index.ts",
		auxiliary: [],
	},
	dependencyPolicy: options.dependencyPolicy ?? {
		authorizationOwner: "docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
		discoveryAuthorizes: false,
	},
	taskPolicy: options.taskPolicy ?? {
		requiredScripts: [],
	},
	projections: options.projections ?? [
		{
			id: `${family}-public-api`,
			path: "src/index.ts",
			compliance: "normative",
			capability: "structure",
			canonicalInputs: ["src/definition.ts"],
		},
	],
	diagnostics: options.diagnostics ?? [
		{
			code: `AFG-${family.toUpperCase()}-001`,
			severity: "error",
			treatment: "auto-reconcile",
			capability: "structure",
		},
	],
	migrations: options.migrations ?? [],
});

const captureValidationError = (
	input: unknown,
): GeneratorContractValidationError => {
	try {
		loadGeneratorContractRegistry(input);
	} catch (error: unknown) {
		if (error instanceof GeneratorContractValidationError) {
			return error;
		}
		throw error;
	}
	throw new Error("expected generator contract validation to fail");
};

const hasIssue = (
	error: GeneratorContractValidationError,
	code: GeneratorContractValidationError["issues"][number]["code"],
): boolean => error.issues.some((issue) => issue.code === code);

describe("loadGeneratorContractRegistry", () => {
	it("loads one valid contract for each generator family", () => {
		const registry = loadGeneratorContractRegistry([
			createFamilyFixture("kernel"),
			createFamilyFixture("erp"),
		]);

		expect(registry.kernel.family).toBe("kernel");
		expect(registry.erp.family).toBe("erp");
		expect(Object.isFrozen(registry)).toBe(true);
	});

	it("rejects duplicate diagnostic identifiers", () => {
		const duplicate = {
			code: "AFG-KERNEL-001",
			severity: "error",
			treatment: "auto-reconcile",
			capability: "structure",
		};
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				diagnostics: [duplicate, duplicate],
			}),
			createFamilyFixture("erp"),
		]);
		expect(hasIssue(error, "AFG-CONTRACT-003")).toBe(true);
	});

	it("rejects two managed owners for the same path", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				filePolicy: [
					{
						path: "src/index.ts",
						disposition: "managed",
						owner: "owner-a",
						capability: "structure",
					},
					{
						path: "src/index.ts",
						disposition: "managed",
						owner: "owner-b",
						capability: "structure",
					},
				],
				projections: [],
			}),
			createFamilyFixture("erp"),
		]);
		expect(hasIssue(error, "AFG-CONTRACT-004")).toBe(true);
	});

	it("rejects a diagnostic without a treatment", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				diagnostics: [
					{
						code: "AFG-KERNEL-001",
						severity: "error",
						capability: "structure",
					},
				],
			}),
			createFamilyFixture("erp"),
		]);
		expect(hasIssue(error, "AFG-CONTRACT-011")).toBe(true);
	});

	it("rejects an unknown capability reference", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				diagnostics: [
					{
						code: "AFG-KERNEL-001",
						severity: "error",
						treatment: "auto-reconcile",
						capability: "unknown-capability",
					},
				],
			}),
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, "AFG-CONTRACT-005")).toBe(true);
	});

	it("rejects a projection without an explicit compliance class", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				projections: [
					{
						id: "kernel-public-api",
						path: "src/index.ts",
						capability: "structure",
						canonicalInputs: ["src/definition.ts"],
					},
				],
			}),
			createFamilyFixture("erp"),
		]);
		expect(hasIssue(error, "AFG-CONTRACT-006")).toBe(true);
	});

	it("rejects a non-contiguous released migration chain", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				release: { state: "authoritative", version: 3 },
				migrations: [{ id: "kernel-v1-to-v2", from: 1, to: 2 }],
			}),
			createFamilyFixture("erp"),
		]);
		expect(hasIssue(error, "AFG-CONTRACT-007")).toBe(true);
	});

	it("rejects invalid repository-relative paths", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				filePolicy: [
					{
						path: "../outside.ts",
						disposition: "canonical",
						owner: "kernel-definition",
						capability: "structure",
					},
				],
				projections: [],
			}),
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, "AFG-CONTRACT-010")).toBe(true);
	});

	it.each([
		{
			name: "semantic canonical owner",
			code: "AFG-CONTRACT-004" as const,
			options: {
				semanticInput: {
					adapter: "kernel-fixture-adapter",
					canonicalOwners: ["kernel-definition", "kernel-definition"],
				},
			},
		},
		{
			name: "workspace root",
			code: "AFG-CONTRACT-003" as const,
			options: {
				pathPolicy: {
					workspaceRoots: ["packages/kernel", "packages/kernel"],
				},
			},
		},
		{
			name: "auxiliary entrypoint",
			code: "AFG-CONTRACT-003" as const,
			options: {
				entrypointPolicy: {
					root: "src/index.ts",
					auxiliary: ["src/server.ts", "src/server.ts"],
				},
			},
		},
		{
			name: "required script",
			code: "AFG-CONTRACT-003" as const,
			options: {
				taskPolicy: {
					requiredScripts: ["typecheck", "typecheck"],
				},
			},
		},
		{
			name: "canonical projection input",
			code: "AFG-CONTRACT-003" as const,
			options: {
				projections: [
					{
						id: "kernel-public-api",
						path: "src/index.ts",
						compliance: "normative",
						capability: "structure",
						canonicalInputs: ["src/definition.ts", "src/definition.ts"],
					},
				],
			},
		},
	])("rejects a duplicate $name", ({ code, options }) => {
		const error = captureValidationError([
			createFamilyFixture("kernel", options),
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, code)).toBe(true);
	});

	it.each([
		".",
		"packages/./kernel",
		`packages/kernel/${String.fromCharCode(0)}`,
	])("rejects non-normalized path %j", (workspaceRoot) => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				pathPolicy: { workspaceRoots: [workspaceRoot] },
			}),
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, "AFG-CONTRACT-010")).toBe(true);
	});

	it("rejects blank semantic identifiers", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", { profiles: [{ id: "   " }] }),
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, "AFG-CONTRACT-001")).toBe(true);
	});

	it("rejects an authoritative release without authoritative capability", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				release: { state: "authoritative", version: 1 },
			}),
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, "AFG-CONTRACT-008")).toBe(true);
	});

	it("rejects unknown contract fields", () => {
		const error = captureValidationError([
			{
				...createFamilyFixture("kernel"),
				packageOverrides: [],
			},
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, "AFG-CONTRACT-002")).toBe(true);
	});

	it("rejects workspace discovery as dependency authorization", () => {
		const error = captureValidationError([
			createFamilyFixture("kernel", {
				dependencyPolicy: {
					authorizationOwner: "docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
					discoveryAuthorizes: true,
				},
			}),
			createFamilyFixture("erp"),
		]);

		expect(hasIssue(error, "AFG-CONTRACT-008")).toBe(true);
	});

	it("requires exactly one contract for each of two families", () => {
		const error = captureValidationError([createFamilyFixture("kernel")]);

		expect(hasIssue(error, "AFG-CONTRACT-009")).toBe(true);
	});

	it("orders validation issues deterministically", () => {
		const input = [
			{
				...createFamilyFixture("kernel", {
					dependencyPolicy: {
						authorizationOwner: "docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
						discoveryAuthorizes: true,
					},
				}),
				packageOverrides: [],
			},
			createFamilyFixture("erp"),
		];

		const first = captureValidationError(input);
		const second = captureValidationError(input);

		expect(second.issues).toEqual(first.issues);
	});
});
