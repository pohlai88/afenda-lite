import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const GENERATOR_FILE_TRANSACTION_SCHEMA =
	"afenda.generator-file-transaction/v1" as const;

export type GeneratorFileWritePolicy =
	| "create"
	| "create-or-same"
	| "replace-if-current";

export interface GeneratorFileTransactionWrite {
	readonly contents: string;
	readonly expectedExistingContents?: string;
	readonly path: string;
	readonly policy: GeneratorFileWritePolicy;
}

export interface GeneratorFileTransactionResult {
	readonly filesWritten: readonly string[];
	readonly schema: typeof GENERATOR_FILE_TRANSACTION_SCHEMA;
	readonly skipped: readonly string[];
}

export class GeneratorFileTransactionError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "GeneratorFileTransactionError";
	}
}

interface ExistingFileSnapshot {
	readonly contents: string | null;
	readonly path: string;
}

const fileExists = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		return (await stat(resolve(repositoryRoot, path))).isFile();
	} catch {
		return false;
	}
};

const readExistingContents = async (
	repositoryRoot: string,
	path: string,
): Promise<string | null> =>
	(await fileExists(repositoryRoot, path))
		? readFile(resolve(repositoryRoot, path), "utf8")
		: null;

const assertUniqueWritePaths = (
	writes: readonly GeneratorFileTransactionWrite[],
): void => {
	const paths = writes.map((write) => write.path);
	if (new Set(paths).size !== paths.length) {
		throw new GeneratorFileTransactionError(
			"file transaction write paths must be unique",
		);
	}
};

const validateWrite = ({
	existing,
	write,
}: {
	readonly existing: string | null;
	readonly write: GeneratorFileTransactionWrite;
}): boolean => {
	if (write.policy === "create") {
		if (existing !== null) {
			throw new GeneratorFileTransactionError(
				`refusing to overwrite existing file ${write.path}`,
			);
		}
		return false;
	}
	if (write.policy === "create-or-same") {
		if (existing === null) {
			return false;
		}
		if (existing !== write.contents) {
			throw new GeneratorFileTransactionError(
				`refusing to overwrite non-matching file ${write.path}`,
			);
		}
		return true;
	}
	if (existing === null) {
		throw new GeneratorFileTransactionError(
			`cannot replace missing file ${write.path}`,
		);
	}
	if (existing !== write.expectedExistingContents) {
		throw new GeneratorFileTransactionError(
			`refusing to replace changed file ${write.path}`,
		);
	}
	if (existing === write.contents) {
		return true;
	}
	return false;
};

const restoreSnapshot = async ({
	repositoryRoot,
	snapshot,
}: {
	readonly repositoryRoot: string;
	readonly snapshot: ExistingFileSnapshot;
}): Promise<void> => {
	const absolutePath = resolve(repositoryRoot, snapshot.path);
	if (snapshot.contents === null) {
		await rm(absolutePath, { force: true });
		return;
	}
	await mkdir(resolve(absolutePath, ".."), { recursive: true });
	await writeFile(absolutePath, snapshot.contents, "utf8");
};

export const applyGeneratorFileTransaction = async ({
	repositoryRoot,
	writes,
}: {
	readonly repositoryRoot: string;
	readonly writes: readonly GeneratorFileTransactionWrite[];
}): Promise<GeneratorFileTransactionResult> => {
	assertUniqueWritePaths(writes);
	const snapshots = await Promise.all(
		writes.map(async (write) =>
			Object.freeze({
				path: write.path,
				contents: await readExistingContents(repositoryRoot, write.path),
			}),
		),
	);
	const validationResults = writes.map((write, index) => {
		const snapshot = snapshots[index];
		if (snapshot === undefined) {
			throw new GeneratorFileTransactionError(
				`file transaction snapshot missing for ${write.path}`,
			);
		}
		return Object.freeze({
			write,
			skipped: validateWrite({ write, existing: snapshot.contents }),
		});
	});
	const skipped = validationResults
		.filter((result) => result.skipped)
		.map((result) => result.write.path);
	const effectiveWrites = validationResults
		.filter((result) => !result.skipped)
		.map((result) => result.write);
	const appliedSnapshots: ExistingFileSnapshot[] = [];
	const writeResults = await Promise.allSettled(
		effectiveWrites.map(async (write) => {
			const snapshot = snapshots.find((entry) => entry.path === write.path);
			if (snapshot === undefined) {
				throw new GeneratorFileTransactionError(
					`file transaction snapshot missing for ${write.path}`,
				);
			}
			appliedSnapshots.push(snapshot);
			const absolutePath = resolve(repositoryRoot, write.path);
			await mkdir(resolve(absolutePath, ".."), { recursive: true });
			await writeFile(absolutePath, write.contents, "utf8");
		}),
	);
	const failedWrite = writeResults.find(
		(result) => result.status === "rejected",
	);
	if (failedWrite !== undefined) {
		await Promise.all(
			appliedSnapshots.map((snapshot) =>
				restoreSnapshot({ repositoryRoot, snapshot }),
			),
		);
		throw new GeneratorFileTransactionError("file transaction rolled back", {
			cause: failedWrite.reason,
		});
	}
	return Object.freeze({
		schema: GENERATOR_FILE_TRANSACTION_SCHEMA,
		filesWritten: Object.freeze(effectiveWrites.map((write) => write.path)),
		skipped: Object.freeze(skipped),
	});
};
