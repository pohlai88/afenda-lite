import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { generatorRegistrations } from "../config.ts";
import type {
	GeneratorDoctorOutputFormat,
	GeneratorFamilyRegistration,
} from "../engine/family-registration.ts";
import {
	GENERATOR_DOCTOR_OUTPUT_FORMATS,
	GeneratorDoctorOutputFormatError,
} from "../engine/family-registration.ts";
import {
	captureRepositoryState,
	compareRepositoryStates,
	GENERATOR_STATE_EXCLUDED_SEGMENTS,
	GENERATOR_STATE_RECURSIVE_ROOTS,
	GENERATOR_STATE_ROOT_FILES,
} from "../engine/repository-state.ts";
import type { GeneratorFamily } from "../engine/types.ts";

export const GEN_0_4_EVIDENCE_SCHEMA =
	"afenda.generator-slice-evidence/v1" as const;

type ProofExecution = "direct-doctor" | "turbo-cli";

export interface Gen04CommandEvidence {
	readonly cwd:
		| "governed-package"
		| "repository-root"
		| "safe-nested-directory";
	readonly execution: ProofExecution;
	readonly exitCode: number;
	readonly family: GeneratorFamily;
	readonly filesystemDelta: number;
	readonly format: GeneratorDoctorOutputFormat;
	readonly gitStatusDelta: number;
	readonly repetitions: number;
}

export interface Gen04FailureEvidence {
	readonly error: "unsupported-output-format";
	readonly exitCode: 40;
	readonly family: GeneratorFamily;
	readonly filesystemDelta: number;
	readonly gitStatusDelta: number;
}

export interface Gen04DirtyFixtureEvidence {
	readonly dirtyFilePreserved: boolean;
	readonly exitCode: number;
	readonly family: GeneratorFamily;
	readonly filesystemDelta: number;
	readonly gitStatusDelta: number;
}

export interface Gen04ClosureEvidence {
	readonly authoritativeCapabilities: Readonly<Record<GeneratorFamily, number>>;
	readonly authorityIntroduced: readonly never[];
	readonly commands: readonly Gen04CommandEvidence[];
	readonly dirtyFixture: Gen04DirtyFixtureEvidence;
	readonly excludedPaths: readonly string[];
	readonly failurePath: Gen04FailureEvidence;
	readonly inventoryPaths: readonly string[];
	readonly result: "pass";
	readonly schema: typeof GEN_0_4_EVIDENCE_SCHEMA;
	readonly scope: "read-only-doctor-state-proof";
	readonly slice: "GEN-0.4";
}

interface ProveOperationInput {
	readonly expectedExitCode: number;
	readonly expectedFailureType?: abstract new (...args: never[]) => Error;
	readonly operation: () => Promise<unknown>;
	readonly repetitions: number;
	readonly repositoryRoot: string;
}

interface OperationProofResult {
	readonly exitCode: number;
	readonly filesystemDelta: number;
	readonly gitStatusDelta: number;
}

interface DirectDoctorScenario {
	readonly family: GeneratorFamily;
	readonly format: GeneratorDoctorOutputFormat;
	readonly repetitions: number;
}

const execFile = promisify(execFileCallback);
const PROCESS_BUFFER_BYTES = 16 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 120_000;

const findRegistration = (
	family: GeneratorFamily,
): GeneratorFamilyRegistration => {
	const registration = generatorRegistrations.find(
		(candidate) => candidate.contract.family === family,
	);
	if (registration === undefined) {
		throw new Error(`generator registration is missing for ${family}`);
	}
	return registration;
};

const readExitCode = (error: unknown): number => {
	if (typeof error !== "object" || error === null) {
		return 40;
	}
	const protocolExitCode = Reflect.get(error, "exitCode");
	if (typeof protocolExitCode === "number") {
		return protocolExitCode;
	}
	const processExitCode = Reflect.get(error, "code");
	return typeof processExitCode === "number" ? processExitCode : 40;
};

const captureGitStatus = async (repositoryRoot: string): Promise<string> => {
	const { stdout } = await execFile(
		"git",
		["-C", repositoryRoot, "status", "--porcelain=v1", "--untracked-files=all"],
		{ maxBuffer: PROCESS_BUFFER_BYTES, windowsHide: true },
	);
	return stdout.replaceAll("\r\n", "\n");
};

const runOperationRepeatedly = async (
	operation: () => Promise<unknown>,
	remaining: number,
): Promise<void> => {
	if (remaining === 0) {
		return;
	}
	await operation();
	await runOperationRepeatedly(operation, remaining - 1);
};

const proveOperation = async ({
	repositoryRoot,
	operation,
	repetitions,
	expectedExitCode,
	expectedFailureType,
}: ProveOperationInput): Promise<OperationProofResult> => {
	const beforeState = await captureRepositoryState(repositoryRoot);
	const beforeGitStatus = await captureGitStatus(repositoryRoot);
	let actualExitCode = 0;
	let failed = false;
	let failureMatchedExpectedType = expectedFailureType === undefined;
	try {
		await runOperationRepeatedly(operation, repetitions);
	} catch (error: unknown) {
		failed = true;
		actualExitCode = readExitCode(error);
		failureMatchedExpectedType =
			expectedFailureType === undefined || error instanceof expectedFailureType;
	}
	const afterState = await captureRepositoryState(repositoryRoot);
	const afterGitStatus = await captureGitStatus(repositoryRoot);
	const filesystemDelta = compareRepositoryStates(beforeState, afterState);
	const gitStatusDelta = beforeGitStatus === afterGitStatus ? 0 : 1;
	if (
		actualExitCode !== expectedExitCode ||
		(expectedExitCode === 0 && failed) ||
		(expectedExitCode !== 0 && !failed) ||
		!failureMatchedExpectedType ||
		filesystemDelta.count !== 0 ||
		gitStatusDelta !== 0
	) {
		throw new Error(
			`read-only proof failed: exit=${actualExitCode}, filesystem-delta=${filesystemDelta.count}, git-status-delta=${gitStatusDelta}, paths=${[
				...filesystemDelta.added,
				...filesystemDelta.changed,
				...filesystemDelta.removed,
			].join(",")}`,
		);
	}
	return Object.freeze({
		exitCode: actualExitCode,
		filesystemDelta: filesystemDelta.count,
		gitStatusDelta,
	});
};

const turboCliPath = createRequire(import.meta.url).resolve("turbo/bin/turbo");

const runTurboDoctor = async (
	family: GeneratorFamily,
	workingDirectory: string,
): Promise<void> => {
	await execFile(
		process.execPath,
		[turboCliPath, "gen", `${family}-generator`],
		{
			cwd: workingDirectory,
			maxBuffer: PROCESS_BUFFER_BYTES,
			timeout: PROCESS_TIMEOUT_MS,
			windowsHide: true,
		},
	);
};

const createFixtureRepository = async (): Promise<{
	readonly dirtyFile: string;
	readonly repositoryRoot: string;
}> => {
	const repositoryRoot = await mkdtemp(join(tmpdir(), "afenda-gen-0.4-"));
	const workspaceRoot = join(
		repositoryRoot,
		"packages",
		"foundation",
		"fixture",
	);
	const dirtyFile = join(repositoryRoot, "apps", "unrelated-dirty.txt");
	await Promise.all([
		mkdir(join(workspaceRoot, "src"), { recursive: true }),
		mkdir(join(repositoryRoot, "apps"), { recursive: true }),
		mkdir(join(repositoryRoot, "docs-V2"), { recursive: true }),
		mkdir(join(repositoryRoot, "scripts"), { recursive: true }),
	]);
	await Promise.all([
		writeFile(
			join(repositoryRoot, "package.json"),
			'{"name":"afenda-gen-0.4-fixture","private":true}\n',
		),
		writeFile(
			join(repositoryRoot, "pnpm-workspace.yaml"),
			'packages:\n  - "packages/*/*"\n',
		),
		writeFile(join(repositoryRoot, "turbo.json"), "{}\n"),
		writeFile(
			join(workspaceRoot, "package.json"),
			'{"name":"@afenda/fixture","private":true,"type":"module"}\n',
		),
		writeFile(join(workspaceRoot, "src", "index.ts"), "export {};\n"),
		writeFile(dirtyFile, "indexed baseline\n"),
	]);
	await execFile("git", ["init", "--quiet", repositoryRoot], {
		maxBuffer: PROCESS_BUFFER_BYTES,
		windowsHide: true,
	});
	await execFile("git", ["-C", repositoryRoot, "add", "."], {
		maxBuffer: PROCESS_BUFFER_BYTES,
		windowsHide: true,
	});
	await writeFile(dirtyFile, "known unrelated dirty content\n");
	return Object.freeze({ repositoryRoot, dirtyFile });
};

const proveDirtyFixture = async (): Promise<Gen04DirtyFixtureEvidence> => {
	const fixture = await createFixtureRepository();
	try {
		const beforeBytes = await readFile(fixture.dirtyFile);
		const registration = findRegistration("kernel");
		const proof = await proveOperation({
			repositoryRoot: fixture.repositoryRoot,
			repetitions: 1,
			expectedExitCode: 0,
			operation: () => registration.doctor(fixture.repositoryRoot),
		});
		const afterBytes = await readFile(fixture.dirtyFile);
		const dirtyFilePreserved = beforeBytes.equals(afterBytes);
		if (!dirtyFilePreserved) {
			throw new Error("doctor changed the isolated dirty fixture file");
		}
		return Object.freeze({
			family: "kernel",
			...proof,
			dirtyFilePreserved,
		});
	} finally {
		await rm(fixture.repositoryRoot, { force: true, recursive: true });
	}
};

const createDirectDoctorEvidence = async (
	repositoryRoot: string,
	family: GeneratorFamily,
	format: GeneratorDoctorOutputFormat,
	repetitions: number,
): Promise<Gen04CommandEvidence> => {
	const registration = findRegistration(family);
	const proof = await proveOperation({
		repositoryRoot,
		repetitions,
		expectedExitCode: 0,
		operation: () => registration.doctor(repositoryRoot, { format }),
	});
	return Object.freeze({
		family,
		format,
		execution: "direct-doctor",
		cwd: "repository-root",
		repetitions,
		...proof,
	});
};

const createTurboDoctorEvidence = async (
	repositoryRoot: string,
	family: GeneratorFamily,
	workingDirectory: string,
	cwd: Gen04CommandEvidence["cwd"],
): Promise<Gen04CommandEvidence> => {
	const proof = await proveOperation({
		repositoryRoot,
		repetitions: 1,
		expectedExitCode: 0,
		operation: () => runTurboDoctor(family, workingDirectory),
	});
	return Object.freeze({
		family,
		format: "text",
		execution: "turbo-cli",
		cwd,
		repetitions: 1,
		...proof,
	});
};

const runDirectScenarios = async (
	repositoryRoot: string,
	scenarios: readonly DirectDoctorScenario[],
	index = 0,
): Promise<readonly Gen04CommandEvidence[]> => {
	const scenario = scenarios[index];
	if (scenario === undefined) {
		return Object.freeze([]);
	}
	const current = await createDirectDoctorEvidence(
		repositoryRoot,
		scenario.family,
		scenario.format,
		scenario.repetitions,
	);
	const remaining = await runDirectScenarios(
		repositoryRoot,
		scenarios,
		index + 1,
	);
	return Object.freeze([current, ...remaining]);
};

export const runGen04ReadOnlyProof = async (
	inputRoot: string,
): Promise<Gen04ClosureEvidence> => {
	const repositoryRoot = resolve(inputRoot);
	const singleRunScenarios = generatorRegistrations.flatMap((registration) =>
		GENERATOR_DOCTOR_OUTPUT_FORMATS.map((format) => ({
			family: registration.contract.family,
			format,
			repetitions: 1,
		})),
	);
	const repeatedRunScenarios = generatorRegistrations.map((registration) => ({
		family: registration.contract.family,
		format: "text" as const,
		repetitions: 2,
	}));
	const commands: Gen04CommandEvidence[] = [
		...(await runDirectScenarios(repositoryRoot, [
			...singleRunScenarios,
			...repeatedRunScenarios,
		])),
	];
	commands.push(
		await createTurboDoctorEvidence(
			repositoryRoot,
			"kernel",
			repositoryRoot,
			"repository-root",
		),
		await createTurboDoctorEvidence(
			repositoryRoot,
			"kernel",
			resolve(repositoryRoot, "packages/foundation/errors"),
			"governed-package",
		),
		await createTurboDoctorEvidence(
			repositoryRoot,
			"erp",
			resolve(repositoryRoot, "docs-V2"),
			"safe-nested-directory",
		),
	);
	const kernelRegistration = findRegistration("kernel");
	const failureProof = await proveOperation({
		repositoryRoot,
		repetitions: 1,
		expectedExitCode: 40,
		expectedFailureType: GeneratorDoctorOutputFormatError,
		operation: () =>
			kernelRegistration.doctor(repositoryRoot, { format: "unsupported" }),
	});
	const authoritativeCapabilities = Object.freeze({
		kernel: findRegistration("kernel").contract.capabilities.filter(
			(capability) => capability.status === "authoritative",
		).length,
		erp: findRegistration("erp").contract.capabilities.filter(
			(capability) => capability.status === "authoritative",
		).length,
	});
	if (
		authoritativeCapabilities.kernel !== 0 ||
		authoritativeCapabilities.erp !== 0
	) {
		throw new Error("GEN-0.4 cannot activate authoritative capabilities");
	}
	return Object.freeze({
		schema: GEN_0_4_EVIDENCE_SCHEMA,
		slice: "GEN-0.4",
		scope: "read-only-doctor-state-proof",
		authorityIntroduced: Object.freeze([]),
		commands: Object.freeze(commands),
		authoritativeCapabilities,
		excludedPaths: Object.freeze(
			GENERATOR_STATE_EXCLUDED_SEGMENTS.map((path) => `${path}/**`),
		),
		inventoryPaths: Object.freeze([
			...GENERATOR_STATE_RECURSIVE_ROOTS.map((path) => `${path}/**`),
			...GENERATOR_STATE_ROOT_FILES,
			"tsconfig*.json",
		]),
		failurePath: Object.freeze({
			family: "kernel",
			error: "unsupported-output-format",
			exitCode: 40,
			filesystemDelta: failureProof.filesystemDelta,
			gitStatusDelta: failureProof.gitStatusDelta,
		}),
		dirtyFixture: await proveDirtyFixture(),
		result: "pass",
	});
};
