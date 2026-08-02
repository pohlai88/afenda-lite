import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
	applyGeneratorFileTransaction,
	type GeneratorFileTransactionWrite,
} from "../engine/file-transaction.ts";
import type {
	GeneratorReconciliationPlanOperation,
	GeneratorReconciliationPlanV1,
} from "../engine/reconciliation-planner.ts";

export const KERNEL_ADOPTION_APPLY_SCHEMA =
	"afenda.kernel-adoption-apply/v1" as const;

export interface KernelAdoptionApplyResult {
	readonly filesChanged: readonly string[];
	readonly schema: typeof KERNEL_ADOPTION_APPLY_SCHEMA;
	readonly skipped: readonly string[];
	readonly writes: true;
}

export class KernelAdoptionApplyError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "KernelAdoptionApplyError";
	}
}

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const pathExists = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		await stat(resolve(repositoryRoot, path));
		return true;
	} catch {
		return false;
	}
};

const contractContents = (packageName: string): string =>
	`# ${packageName} contract\n\nGenerated kernel adoption contract. Replace with the package semantic contract before claiming production completeness.\n`;

const rootEntrypointContents = (): string => "export {};\n";

const selectKernelAdoptionOperations = (
	plan: GeneratorReconciliationPlanV1,
): readonly GeneratorReconciliationPlanOperation[] =>
	Object.freeze(
		plan.operations
			.filter(
				(operation) =>
					operation.family === "kernel" &&
					operation.status === "ready" &&
					operation.writes === false &&
					(operation.action === "regenerate-authority-owned-artifact" ||
						operation.action === "upgrade-to-canonical-shape"),
			)
			.sort((left, right) =>
				compareText(left.paths[0] ?? "", right.paths[0] ?? ""),
			),
	);

const readJsonRecord = async (
	repositoryRoot: string,
	path: string,
): Promise<Record<string, unknown>> => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await readFile(resolve(repositoryRoot, path), "utf8"));
	} catch (cause: unknown) {
		throw new KernelAdoptionApplyError(`${path} must be readable JSON`, {
			cause,
		});
	}
	if (!isRecord(parsed)) {
		throw new KernelAdoptionApplyError(`${path} must contain a JSON object`);
	}
	return parsed;
};

const withRootExport = (
	packageJson: Record<string, unknown>,
): Record<string, unknown> => {
	const exportsValue = isRecord(packageJson.exports) ? packageJson.exports : {};
	if (Object.hasOwn(exportsValue, ".")) {
		return packageJson;
	}
	return {
		...packageJson,
		exports: {
			".": {
				types: "./src/index.ts",
				default: "./src/index.ts",
			},
			...exportsValue,
		},
	};
};

const assertNoGeneratedFileConflict = async ({
	contents,
	operation,
	repositoryRoot,
}: {
	readonly contents: string;
	readonly operation: GeneratorReconciliationPlanOperation;
	readonly repositoryRoot: string;
}): Promise<void> => {
	const [path] = operation.paths;
	if (path === undefined) {
		throw new KernelAdoptionApplyError(
			`kernel operation ${operation.package} is missing a path`,
		);
	}
	if (!(await pathExists(repositoryRoot, path))) {
		return;
	}
	const existing = await readFile(resolve(repositoryRoot, path), "utf8");
	if (existing !== contents) {
		throw new KernelAdoptionApplyError(
			`refusing to overwrite non-matching kernel adoption file ${path}`,
		);
	}
};

const assertNoKernelAdoptionConflicts = async ({
	operations,
	repositoryRoot,
}: {
	readonly operations: readonly GeneratorReconciliationPlanOperation[];
	readonly repositoryRoot: string;
}): Promise<void> => {
	await Promise.all(
		operations.map(async (operation) => {
			const path = operation.paths[0] ?? "";
			if (path.endsWith("/CONTRACT.md")) {
				await assertNoGeneratedFileConflict({
					repositoryRoot,
					operation,
					contents: contractContents(operation.package),
				});
			} else if (path.endsWith("/src/index.ts")) {
				await assertNoGeneratedFileConflict({
					repositoryRoot,
					operation,
					contents: rootEntrypointContents(),
				});
			} else if (path.endsWith("/package.json")) {
				await readJsonRecord(repositoryRoot, path);
			}
		}),
	);
};

const isGeneratorFileTransactionWrite = (
	write: GeneratorFileTransactionWrite | null,
): write is GeneratorFileTransactionWrite => write !== null;

const createPackageJsonRootExportWrite = async ({
	operation,
	repositoryRoot,
}: {
	readonly operation: GeneratorReconciliationPlanOperation;
	readonly repositoryRoot: string;
}): Promise<GeneratorFileTransactionWrite | null> => {
	const [path] = operation.paths;
	if (path === undefined || !path.endsWith("/package.json")) {
		throw new KernelAdoptionApplyError(
			`kernel root export operation ${operation.package} must target package.json`,
		);
	}
	const currentContents = await readFile(resolve(repositoryRoot, path), "utf8");
	let parsed: unknown;
	try {
		parsed = JSON.parse(currentContents);
	} catch (cause: unknown) {
		throw new KernelAdoptionApplyError(`${path} must be readable JSON`, {
			cause,
		});
	}
	if (!isRecord(parsed)) {
		throw new KernelAdoptionApplyError(`${path} must contain a JSON object`);
	}
	const current = parsed;
	const next = withRootExport(current);
	if (JSON.stringify(current) === JSON.stringify(next)) {
		return Object.freeze({
			path,
			contents: currentContents,
			expectedExistingContents: currentContents,
			policy: "replace-if-current",
		});
	}
	return Object.freeze({
		path,
		contents: `${JSON.stringify(next, null, "\t")}\n`,
		expectedExistingContents: currentContents,
		policy: "replace-if-current",
	});
};

const createGeneratedFileWrite = (
	operation: GeneratorReconciliationPlanOperation,
): GeneratorFileTransactionWrite => {
	const [path] = operation.paths;
	if (path === undefined) {
		throw new KernelAdoptionApplyError(
			`kernel operation ${operation.package} is missing a path`,
		);
	}
	if (path.endsWith("/CONTRACT.md")) {
		return Object.freeze({
			path,
			contents: contractContents(operation.package),
			policy: "create-or-same",
		});
	}
	if (path.endsWith("/src/index.ts")) {
		return Object.freeze({
			path,
			contents: rootEntrypointContents(),
			policy: "create-or-same",
		});
	}
	throw new KernelAdoptionApplyError(
		`unsupported kernel generated file operation ${path}`,
	);
};

export const applyKernelAdoptionTreatments = async ({
	plan,
	repositoryRoot,
}: {
	readonly plan: GeneratorReconciliationPlanV1;
	readonly repositoryRoot: string;
}): Promise<KernelAdoptionApplyResult> => {
	const operations = selectKernelAdoptionOperations(plan);
	await assertNoKernelAdoptionConflicts({ repositoryRoot, operations });
	const writes = await Promise.all(
		operations.map((operation) => {
			const path = operation.paths[0] ?? "";
			if (path.endsWith("/CONTRACT.md")) {
				return createGeneratedFileWrite(operation);
			}
			if (path.endsWith("/src/index.ts")) {
				return createGeneratedFileWrite(operation);
			}
			if (path.endsWith("/package.json")) {
				return createPackageJsonRootExportWrite({
					repositoryRoot,
					operation,
				});
			}
			return null;
		}),
	);
	const transaction = await applyGeneratorFileTransaction({
		repositoryRoot,
		writes: writes.filter(isGeneratorFileTransactionWrite),
	});
	return Object.freeze({
		schema: KERNEL_ADOPTION_APPLY_SCHEMA,
		writes: true,
		filesChanged: transaction.filesWritten,
		skipped: transaction.skipped,
	});
};
