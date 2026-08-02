import { createHash } from "node:crypto";
import { cwd, stdout } from "node:process";

import { generatorContracts } from "../contracts.ts";
import { createGeneratorGovernanceConvergenceReport } from "./governance-convergence.ts";
import {
	createGeneratorLocalRepoGovernanceReport,
	type GeneratorLocalRepoGovernanceReportV1,
} from "./local-repo-governance.ts";
import {
	discoverWorkspaces,
	type WorkspaceFamilyClassification,
} from "./workspace-discovery.ts";

export const GENERATOR_CHECK_SCHEMA = "afenda.generator-check/v1" as const;
export const GENERATOR_CHECK_TASK_NAME = "generator:check" as const;
export const GENERATOR_CHECK_ROOT_TASK_NAME = "//#generator:check" as const;
export const GENERATOR_CHECK_SCRIPT =
	"tsx turbo/generators/engine/generator-check.ts" as const;
export const GENERATOR_CHECK_TASK_INPUTS = Object.freeze([
	"$TURBO_ROOT$/turbo/generators/config.ts",
	"$TURBO_ROOT$/turbo/generators/contracts.ts",
	"$TURBO_ROOT$/turbo/generators/engine/**",
	"$TURBO_ROOT$/turbo/generators/erp-generator/**",
	"$TURBO_ROOT$/turbo/generators/kernel-generator/**",
	"$TURBO_ROOT$/docs-V2/monorepo/**",
	"$TURBO_ROOT$/docs-V2/modules/PACKAGE-GOVERNANCE.md",
	"$TURBO_ROOT$/pnpm-workspace.yaml",
	"$TURBO_ROOT$/package.json",
	"$TURBO_ROOT$/pnpm-lock.yaml",
	"$TURBO_ROOT$/turbo.json",
] as const);
export const GENERATOR_CHECK_TASK_OUTPUTS = Object.freeze([] as const);

export interface GeneratorCheckReportV1 {
	readonly contractDigest: string;
	readonly families: readonly {
		readonly authoritativeCapabilities: number;
		readonly family: "erp" | "kernel";
		readonly modes: readonly string[];
		readonly release: "internal" | "authoritative";
	}[];
	readonly localRepoGovernance: {
		readonly ciRequired: false;
		readonly commandCount: number;
		readonly remainingSlices: number;
		readonly report: GeneratorLocalRepoGovernanceReportV1;
	};
	readonly phaseExitGovernance: {
		readonly blocked: number;
		readonly issues: number;
		readonly warnings: number;
	};
	readonly schema: typeof GENERATOR_CHECK_SCHEMA;
	readonly task: {
		readonly inputs: readonly string[];
		readonly name: typeof GENERATOR_CHECK_TASK_NAME;
		readonly outputs: readonly string[];
		readonly rootTaskName: typeof GENERATOR_CHECK_ROOT_TASK_NAME;
		readonly script: typeof GENERATOR_CHECK_SCRIPT;
	};
	readonly workspaceSummary: {
		readonly erpCandidates: number;
		readonly kernelCandidates: number;
		readonly outsideFamilyScope: number;
		readonly total: number;
	};
}

type JsonValue =
	| null
	| boolean
	| number
	| string
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

const isPlainObject = (
	value: unknown,
): value is { readonly [key: string]: unknown } => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
};

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const canonicalJson = (value: unknown): JsonValue => {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "string"
	) {
		return value;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new GeneratorCheckError(
				"contract data contains a non-finite number",
			);
		}
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(canonicalJson);
	}
	if (isPlainObject(value)) {
		const result: Record<string, JsonValue> = {};
		for (const key of Object.keys(value).sort(compareText)) {
			const child = value[key];
			if (child !== undefined) {
				result[key] = canonicalJson(child);
			}
		}
		return result;
	}
	throw new GeneratorCheckError("contract data must be JSON-compatible");
};

const serializeCanonicalJson = (value: unknown): string => {
	const serialized = JSON.stringify(canonicalJson(value));
	if (serialized === undefined) {
		throw new GeneratorCheckError("contract data cannot be serialized");
	}
	return serialized;
};

const digestContracts = (): string =>
	createHash("sha256")
		.update(serializeCanonicalJson(generatorContracts))
		.digest("hex");

const classifyWorkspace = (
	classification: WorkspaceFamilyClassification,
): "erp" | "kernel" | "outside" => {
	if (classification.kind === "outside-generator-families") {
		return "outside";
	}
	return classification.family;
};

export class GeneratorCheckError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "GeneratorCheckError";
	}
}

export const runGeneratorCheck = async (
	repositoryRoot = cwd(),
): Promise<GeneratorCheckReportV1> => {
	const [discovery, governance] = await Promise.all([
		discoverWorkspaces({
			contracts: generatorContracts,
			repositoryRoot,
		}),
		createGeneratorGovernanceConvergenceReport({ repositoryRoot }),
	]);
	const localRepoGovernance = createGeneratorLocalRepoGovernanceReport();
	if (governance.summary.issues > 0) {
		throw new GeneratorCheckError(
			`generator governance convergence failed with ${governance.summary.issues} issue(s)`,
		);
	}
	let kernelCandidates = 0;
	let erpCandidates = 0;
	let outsideFamilyScope = 0;
	for (const workspace of discovery.workspaces) {
		const family = classifyWorkspace(workspace.classification);
		if (family === "kernel") {
			kernelCandidates += 1;
		} else if (family === "erp") {
			erpCandidates += 1;
		} else {
			outsideFamilyScope += 1;
		}
	}

	return Object.freeze({
		schema: GENERATOR_CHECK_SCHEMA,
		contractDigest: digestContracts(),
		localRepoGovernance: Object.freeze({
			ciRequired: localRepoGovernance.localOnly.ciRequired,
			commandCount: localRepoGovernance.commandCatalog.length,
			remainingSlices: localRepoGovernance.stopBoundary.remainingSlices.length,
			report: localRepoGovernance,
		}),
		phaseExitGovernance: Object.freeze({
			issues: governance.summary.issues,
			warnings: governance.summary.warnings,
			blocked: governance.summary.blocked,
		}),
		families: Object.freeze(
			[generatorContracts.kernel, generatorContracts.erp].map((contract) =>
				Object.freeze({
					family: contract.family,
					release: contract.release.state,
					modes: Object.freeze(contract.modes.map((mode) => mode.id)),
					authoritativeCapabilities: contract.capabilities.filter(
						(capability) => capability.status === "authoritative",
					).length,
				}),
			),
		),
		task: Object.freeze({
			name: GENERATOR_CHECK_TASK_NAME,
			rootTaskName: GENERATOR_CHECK_ROOT_TASK_NAME,
			script: GENERATOR_CHECK_SCRIPT,
			inputs: GENERATOR_CHECK_TASK_INPUTS,
			outputs: GENERATOR_CHECK_TASK_OUTPUTS,
		}),
		workspaceSummary: Object.freeze({
			total: discovery.workspaces.length,
			kernelCandidates,
			erpCandidates,
			outsideFamilyScope,
		}),
	});
};

const isDirectExecution = (): boolean => {
	const [, entrypoint] = process.argv;
	return (
		typeof entrypoint === "string" && entrypoint.endsWith("generator-check.ts")
	);
};

if (isDirectExecution()) {
	try {
		const report = await runGeneratorCheck();
		stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	} catch (error: unknown) {
		process.exitCode = 1;
		const message =
			error instanceof Error ? error.message : "generator check failed";
		stdout.write(`${message}\n`);
	}
}
