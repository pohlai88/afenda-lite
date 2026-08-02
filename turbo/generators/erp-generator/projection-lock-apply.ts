import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { applyGeneratorFileTransaction } from "../engine/file-transaction.ts";
import type {
	GeneratorReconciliationPlanOperation,
	GeneratorReconciliationPlanV1,
} from "../engine/reconciliation-planner.ts";

export const ERP_PROJECTION_LOCK_APPLY_SCHEMA =
	"afenda.erp-projection-lock-apply/v1" as const;

export interface ErpProjectionLockDocumentV1 {
	readonly digest: string;
	readonly package: string;
	readonly path: string;
	readonly schema: "afenda.erp-projection-lock/v1";
}

export interface ErpProjectionLockApplyResult {
	readonly filesWritten: readonly string[];
	readonly schema: typeof ERP_PROJECTION_LOCK_APPLY_SCHEMA;
	readonly skipped: readonly string[];
	readonly writes: true;
}

export class ErpProjectionLockApplyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErpProjectionLockApplyError";
	}
}

interface ProjectionLockExpectedState {
	readonly digest: string;
	readonly lockPath: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

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

const parseExpectedState = (
	operation: GeneratorReconciliationPlanOperation,
): ProjectionLockExpectedState => {
	const parsed: unknown = JSON.parse(operation.expectedState);
	if (
		!isRecord(parsed) ||
		typeof parsed.digest !== "string" ||
		typeof parsed.lockPath !== "string"
	) {
		throw new ErpProjectionLockApplyError(
			`operation ${operation.package} does not contain projection lock expected state`,
		);
	}
	return Object.freeze({
		digest: parsed.digest,
		lockPath: parsed.lockPath,
	});
};

const createLockDocument = (
	operation: GeneratorReconciliationPlanOperation,
	expected: ProjectionLockExpectedState,
): ErpProjectionLockDocumentV1 =>
	Object.freeze({
		schema: "afenda.erp-projection-lock/v1",
		package: operation.package,
		path: expected.lockPath,
		digest: expected.digest,
	});

const renderLockDocument = (document: ErpProjectionLockDocumentV1): string =>
	`${JSON.stringify(document, null, "\t")}\n`;

const selectProjectionLockOperations = (
	plan: GeneratorReconciliationPlanV1,
): readonly GeneratorReconciliationPlanOperation[] =>
	Object.freeze(
		plan.operations
			.filter(
				(operation) =>
					operation.family === "erp" &&
					operation.action === "reconcile-projection" &&
					operation.status === "ready" &&
					operation.writes === false,
			)
			.sort((left, right) =>
				compareText(left.paths[0] ?? "", right.paths[0] ?? ""),
			),
	);

const assertNoConflictingExistingLocks = async ({
	operations,
	repositoryRoot,
}: {
	readonly operations: readonly GeneratorReconciliationPlanOperation[];
	readonly repositoryRoot: string;
}): Promise<void> => {
	await Promise.all(
		operations.map(async (operation) => {
			const expected = parseExpectedState(operation);
			const document = createLockDocument(operation, expected);
			if (!(await pathExists(repositoryRoot, expected.lockPath))) {
				return;
			}
			const existing = await readFile(
				resolve(repositoryRoot, expected.lockPath),
				"utf8",
			);
			if (existing !== renderLockDocument(document)) {
				throw new ErpProjectionLockApplyError(
					`refusing to overwrite non-matching projection lock ${expected.lockPath}`,
				);
			}
		}),
	);
};

export const applyErpProjectionLocks = async ({
	plan,
	repositoryRoot,
}: {
	readonly plan: GeneratorReconciliationPlanV1;
	readonly repositoryRoot: string;
}): Promise<ErpProjectionLockApplyResult> => {
	const operations = selectProjectionLockOperations(plan);
	await assertNoConflictingExistingLocks({ repositoryRoot, operations });
	const transaction = await applyGeneratorFileTransaction({
		repositoryRoot,
		writes: operations.map((operation) => {
			const expected = parseExpectedState(operation);
			const document = createLockDocument(operation, expected);
			return {
				path: expected.lockPath,
				contents: renderLockDocument(document),
				policy: "create-or-same",
			};
		}),
	});
	return Object.freeze({
		schema: ERP_PROJECTION_LOCK_APPLY_SCHEMA,
		writes: true,
		filesWritten: transaction.filesWritten,
		skipped: transaction.skipped,
	});
};
