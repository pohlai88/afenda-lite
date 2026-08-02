import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	GENERATOR_CHECK_ROOT_TASK_NAME,
	GENERATOR_CHECK_SCRIPT,
	GENERATOR_CHECK_TASK_INPUTS,
	GENERATOR_CHECK_TASK_NAME,
	GENERATOR_CHECK_TASK_OUTPUTS,
	runGeneratorCheck,
} from "../engine/generator-check.ts";
import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";

interface JsonRecord {
	readonly [key: string]: unknown;
}

const isJsonRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readJsonRecord = async (path: string): Promise<JsonRecord> => {
	const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
	if (!isJsonRecord(parsed)) {
		throw new Error(`${path} did not contain a JSON object`);
	}
	return parsed;
};

const readNestedRecord = (record: JsonRecord, key: string): JsonRecord => {
	const value = record[key];
	if (!isJsonRecord(value)) {
		throw new Error(`${key} did not contain a JSON object`);
	}
	return value;
};

describe("generator:check task contract", () => {
	it("emits a deterministic read-only generator check report", {
		timeout: 30_000,
	}, async () => {
		const repositoryRoot = resolve(
			dirname(fileURLToPath(import.meta.url)),
			"../../..",
		);
		const before = await captureRepositoryState(repositoryRoot);
		const first = await runGeneratorCheck(repositoryRoot);
		const second = await runGeneratorCheck(repositoryRoot);
		const after = await captureRepositoryState(repositoryRoot);

		expect(second).toEqual(first);
		expect(compareRepositoryStates(before, after)).toEqual({
			added: [],
			changed: [],
			removed: [],
			count: 0,
		});
		expect(first).toEqual({
			schema: "afenda.generator-check/v1",
			contractDigest: first.contractDigest,
			families: [
				{
					family: "kernel",
					release: "internal",
					modes: ["doctor"],
					authoritativeCapabilities: 0,
				},
				{
					family: "erp",
					release: "internal",
					modes: ["doctor"],
					authoritativeCapabilities: 0,
				},
			],
			phaseExitGovernance: {
				issues: 0,
				warnings: 0,
				blocked: 0,
			},
			task: {
				name: GENERATOR_CHECK_TASK_NAME,
				rootTaskName: GENERATOR_CHECK_ROOT_TASK_NAME,
				script: GENERATOR_CHECK_SCRIPT,
				inputs: GENERATOR_CHECK_TASK_INPUTS,
				outputs: GENERATOR_CHECK_TASK_OUTPUTS,
			},
			workspaceSummary: {
				total: 38,
				kernelCandidates: 18,
				erpCandidates: 13,
				outsideFamilyScope: 7,
			},
		});
		expect(first.contractDigest).toMatch(/^[a-f0-9]{64}$/);
	});

	it("keeps the root package script and Turbo task derived from one policy", async () => {
		const repositoryRoot = resolve(
			dirname(fileURLToPath(import.meta.url)),
			"../../..",
		);
		const packageJson = await readJsonRecord(
			resolve(repositoryRoot, "package.json"),
		);
		const turboJson = await readJsonRecord(
			resolve(repositoryRoot, "turbo.json"),
		);
		const scripts = readNestedRecord(packageJson, "scripts");
		const tasks = readNestedRecord(turboJson, "tasks");
		const task = readNestedRecord(tasks, GENERATOR_CHECK_ROOT_TASK_NAME);

		expect(scripts[GENERATOR_CHECK_TASK_NAME]).toBe(GENERATOR_CHECK_SCRIPT);
		expect(task.inputs).toEqual(GENERATOR_CHECK_TASK_INPUTS);
		expect(task.outputs).toEqual(GENERATOR_CHECK_TASK_OUTPUTS);
		expect(GENERATOR_CHECK_TASK_INPUTS).toEqual([
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
		]);
	});
});
